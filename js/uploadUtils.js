export function uploadFileToS3WithProgress(url, fileBlob, overlayProgress, abortUploadRef) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    abortUploadRef.current = xhr;
    xhr.open('PUT', url, true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        overlayProgress.style.width = `${percent}%`;
        overlayProgress.textContent = `${percent}%`;
      }
    };
    xhr.onload = () => {
      xhr.status === 200 ? resolve() : reject(new Error('S3 upload failed with status ' + xhr.status));
    };
    xhr.onerror = () => reject(new Error('S3 upload failed'));
    if (abortUploadRef.cancelled) {
      xhr.abort();
      reject(new Error('Upload cancelled by user.'));
      return;
    }
    xhr.send(fileBlob);
  });
}

export async function uploadFileToS3MultiPart(partUrls, fileBlob, uploadId, overlayText, overlayProgress, COMPLETE_MULTIPART_UPLOAD_URL, abortUploadRef) {
  const chunkSize = Math.ceil(fileBlob.size / partUrls.length);
  const totalParts = partUrls.length;
  const completedParts = [];
  const perPartProgress = new Array(totalParts).fill(0);
  const totalSize = fileBlob.size;

  const expectedParts = Math.ceil(fileBlob.size / chunkSize);
  if (partUrls.length < expectedParts) {
    throw new Error(`❌ Not enough presigned URLs. Expected ${expectedParts}, but got ${partUrls.length}`);
  }

  // UI setup
  const progressContainer = document.getElementById('multi-part-progress-container');
  const statusText = document.getElementById('overall-progress-status');
  progressContainer.innerHTML = '';
  statusText.textContent = '';

  function createPartProgressUI(partNumber) {
    const container = document.createElement('div');
    container.classList.add('multipart-entry');

    const label = document.createElement('div');
    label.textContent = `Part ${partNumber}`;
    label.className = 'multipart-part';

    const bar = document.createElement('div');
    bar.classList.add('multipart-progress');

    const fill = document.createElement('div');
    fill.classList.add('multipart-fill');
    fill.style.width = '0%';

    bar.appendChild(fill);
    container.appendChild(label);
    container.appendChild(bar);
    progressContainer.appendChild(container);

    return { fill, container, label };
  }

  function uploadPart(index) {
    return () => new Promise((resolve, reject) => {
      const url = partUrls[index];
      const partNumber = index + 1;
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, fileBlob.size);
      const blob = fileBlob.slice(start, end);
      const partSize = blob.size;

      const { fill, container, label } = createPartProgressUI(partNumber);

      const xhr = new XMLHttpRequest();
      abortUploadRef.current = xhr;
      xhr.open('PUT', url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / partSize) * 100);
          fill.style.width = `${percent}%`;
          fill.textContent = `${percent}%`;

          perPartProgress[index] = e.loaded;
          const uploadedBytes = perPartProgress.reduce((a, b) => a + b, 0);
          const totalPercent = Math.round((uploadedBytes / totalSize) * 100);
          overlayProgress.style.width = `${totalPercent}%`;
          overlayProgress.textContent = `${totalPercent}%`;

          const finished = completedParts.filter(Boolean).length;
          statusText.textContent = `Uploaded ${finished} of ${totalParts} parts`;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const etag = xhr.getResponseHeader('ETag');
          completedParts[index] = { PartNumber: partNumber, ETag: etag };

          fill.style.width = '100%';
          fill.textContent = 'Done';

          setTimeout(() => {
            container.remove();
          }, 800);

          const finished = completedParts.filter(Boolean).length;
          statusText.textContent = `Uploaded ${finished} of ${totalParts} parts`;
          resolve();
        } else {
          label.textContent = `Part ${partNumber} failed`;
          fill.style.backgroundColor = '#F44336';
          container.classList.add('error');
          reject(new Error(`Failed part ${partNumber}`));
        }
      };

      xhr.onerror = () => {
        label.textContent = `Part ${partNumber} failed`;
        fill.style.backgroundColor = '#F44336';
        container.classList.add('error');
        reject(new Error(`Failed part ${partNumber}`));
      };

      if (abortUploadRef.cancelled) {
        xhr.abort();
        reject(new Error('Upload cancelled by user.'));
        return;
      }

      xhr.send(blob);
    });
  }

  function withRetries(taskFactory, retries = 3, delay = 1000) {
    return async function retryWrapper() {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await taskFactory();
        } catch (err) {
          if (attempt === retries) throw err;
          console.warn(`Retrying part (attempt ${attempt})...`);

          // Update UI to reflect retry attempt
          const partMatch = err.message.match(/part (\d+)/i);
          if (partMatch) {
            const partNumber = partMatch[1];
            const label = [...document.querySelectorAll('.multipart-part')]
              .find(el => el.textContent.includes(`Part ${partNumber}`));
            if (label) label.textContent = `Retrying part ${partNumber} (attempt ${attempt + 1})...`;
          }

          await new Promise(res => setTimeout(res, delay * attempt)); // exponential backoff
        }
      }
    };
  }

  const tasks = Array.from({ length: totalParts }, (_, i) => withRetries(uploadPart(i), 3, 1000));
  await runWithConcurrencyLimit(tasks, 5); // Max 5 parallel uploads

  const key = partUrls[0].split('?')[0].split('.com/')[1];
  const completeResponse = await fetch(COMPLETE_MULTIPART_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UploadId: uploadId, Key: key, Parts: completedParts })
  });

  if (!completeResponse.ok) throw new Error('Failed to complete multipart upload');

  overlayProgress.style.width = '100%';
  overlayProgress.textContent = '100%';
  overlayText.textContent = 'Upload complete. Finalizing...';
}

async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  let index = 0;

  const workers = new Array(limit).fill(null).map(async () => {
    while (index < tasks.length) {
      const current = index++;
      try {
        const result = await tasks[current]();
        results[current] = result;
      } catch (err) {
        throw err;
      }
    }
  });

  await Promise.all(workers);
  return results;
}
