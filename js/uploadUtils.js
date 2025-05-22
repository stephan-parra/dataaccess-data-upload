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
  const chunkSize = 5 * 1024 * 1024;
  const totalParts = partUrls.length;
  let uploadedBytes = 0;
  const totalSize = fileBlob.size;
  const completedParts = [];

  const expectedParts = Math.ceil(fileBlob.size / chunkSize);
  if (partUrls.length < expectedParts) {
    throw new Error(`❌ Not enough presigned URLs. Expected ${expectedParts}, but got ${partUrls.length}`);
  }

  for (let index = 0; index < totalParts; index++) {
    if (abortUploadRef.cancelled) throw new Error('Upload cancelled by user.');
    const url = partUrls[index];
    const partNumber = index + 1;
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, fileBlob.size);
    const blob = fileBlob.slice(start, end);
    overlayText.textContent = `Uploading part ${partNumber} of ${totalParts}`;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      abortUploadRef.current = xhr;
      xhr.open('PUT', url, true);
      xhr.onload = () => {
        if (xhr.status === 200) {
          uploadedBytes += blob.size;
          const etag = xhr.getResponseHeader('ETag');
          completedParts.push({ PartNumber: partNumber, ETag: etag });

          const percent = Math.round(((index + 1) / totalParts) * 100);

          // Animate the numeric percentage
          const current = parseInt(overlayProgress.textContent.replace('%', '')) || 0;
          const step = percent > current ? 1 : -1;
          const interval = setInterval(() => {
            const value = parseInt(overlayProgress.textContent.replace('%', '')) || 0;
            if (value === percent) {
              clearInterval(interval);
            } else {
              overlayProgress.textContent = `${value + step}%`;
            }
          }, 15);

          overlayProgress.style.width = `${percent}%`;

          resolve();
        } else {
          reject(new Error(`Failed part ${partNumber}`));
        }
      };
      xhr.onerror = () => reject(new Error(`Failed part ${partNumber}`));
      xhr.send(blob);
    });
  }

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