document.addEventListener('DOMContentLoaded', function () {
    // WARNING: Embedding your AWS credentials in client-side code is extremely insecure.
    AWS.config.update({
      accessKeyId: 'AKIATOOFWAOJ3GTHRM5M',          // Replace with your AWS Access Key
      secretAccessKey: 'F/Xlh8+QdRPM0S3J6wXFjabDu5VqDJQAAsy7AXac', // Replace with your AWS Secret Access Key
      region: 'ap-southeast-2'                      // e.g., 'us-east-1' or 'ap-southeast-2'
    });
  
    // Create an S3 instance
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: { Bucket: 'nz.sd.surveylocationdata.demo' }     // Replace with your S3 bucket name
    });
  
    // Get references to relevant form elements
    const form = document.getElementById('dataForm');
    const fileInput = document.getElementById('file_upload');
    const fileNameField = document.getElementById('file_name');
    const messageContainer = document.getElementById('submission-message');
  
    // Attach the submit event handler to the form
    form.addEventListener('submit', function (event) {
      event.preventDefault();
  
      const file = fileInput.files[0];
      if (!file) {
        messageContainer.textContent = 'Please select a file to upload.';
        return;
      }
  
      // Display the file name
      fileNameField.textContent = file.name;
  
      // Configure S3 upload parameters
      const params = {
        Key: file.name,              // You can specify a path here if needed, e.g., 'uploads/' + file.name
        Body: file,
        ContentType: file.type,
        ACL: 'private'           // Optional: adjust based on your bucket's policy
      };
  
      // Upload the file using the AWS SDK
      s3.upload(params, function (err, data) {
        if (err) {
          console.error('Error uploading file:', err);
          messageContainer.textContent = 'Error uploading file: ' + err.message;
        } else {
          console.log('File uploaded successfully:', data);
          messageContainer.textContent = 'File uploaded successfully! URL: ' + data.Location;
        }
      });
    });
  });
  