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

  const expectedParts = Math.ceil(fileBlob.size / chunkSize);
  if (partUrls.length < expectedParts) {
    throw new Error(`❌ Not enough presigned URLs. Expected ${expectedParts}, but got ${partUrls.length}`);
  }

  function uploadPart(index) {
    return () => new Promise((resolve, reject) => {
      const url = partUrls[index];
      const partNumber = index + 1;
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, fileBlob.size);
      const blob = fileBlob.slice(start, end);

      overlayText.textContent = `Uploading part ${partNumber} of ${totalParts}`;

      const xhr = new XMLHttpRequest();
      abortUploadRef.current = xhr;
      xhr.open('PUT', url, true);

      xhr.onload = () => {
        if (xhr.status === 200) {
          const etag = xhr.getResponseHeader('ETag');
          completedParts[index] = { PartNumber: partNumber, ETag: etag };

          const percent = Math.round(((completedParts.filter(Boolean).length) / totalParts) * 100);
          overlayProgress.style.width = `${percent}%`;
          overlayProgress.textContent = `${percent}%`;
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

  // Limit concurrency to 5 uploads at a time
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
  await runWithConcurrencyLimit(tasks, 5); // max 5 parallel uploads

  // Complete upload
  const key = partUrls[0].split('?')[0].split('.com/')[1];
  const completeResponse = await fetch(COMPLETE_MULTIPART_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      UploadId: uploadId,
      Key: key,
      Parts: completedParts
    })
  });

  if (!completeResponse.ok) throw new Error('Failed to complete multipart upload');
  overlayProgress.style.width = '100%';
  overlayProgress.textContent = '100%';
  overlayText.textContent = 'Upload complete. Finalizing...';
}