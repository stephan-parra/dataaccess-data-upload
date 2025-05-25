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

  // Sanity check
  const expectedParts = Math.ceil(fileBlob.size / chunkSize);
  if (partUrls.length < expectedParts) {
    throw new Error(`❌ Not enough presigned URLs. Expected ${expectedParts}, but got ${partUrls.length}`);
  }

  // Setup UI containers
  const progressContainer = document.getElementById('multi-part-progress-container');
  const statusText = document.getElementById('overall-progress-status');
  progressContainer.innerHTML = '';
  statusText.textContent = '';

  // Create UI for each part
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

    return fill;
  }

  const partUIRefs = Array.from({ length: totalParts }, (_, i) => createPartProgressUI(i + 1));

  function uploadPart(index) {
    return () => new Promise((resolve, reject) => {
      const url = partUrls[index];
      const partNumber = index + 1;
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, fileBlob.size);
      const blob = fileBlob.slice(start, end);
      const partSize = blob.size;

      const fillBar = partUIRefs[index];
      const xhr = new XMLHttpRequest();
      abortUploadRef.current = xhr;

      xhr.open('PUT', url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / partSize) * 100);
          fillBar.style.width = `${percent}%`;
          fillBar.textContent = `${percent}%`;

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

          const finished = completedParts.filter(Boolean).length;
          statusText.textContent = `Uploaded ${finished} of ${totalParts} parts`;
          resolve();
        } else {
          reject(new Error(`Failed part ${partNumber}`));
        }
      };

      xhr.onerror = () => reject(new Error(`Failed part ${partNumber}`));

      if (abortUploadRef.cancelled) {
        xhr.abort();
        reject(new Error('Upload cancelled by user.'));
        return;
      }

      xhr.send(blob);
    });
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

  const tasks = Array.from({ length: totalParts }, (_, i) => uploadPart(i));
  await runWithConcurrencyLimit(tasks, 5); // Max 5 parallel uploads

  // Finalize multipart
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
