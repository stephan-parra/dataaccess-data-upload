document.addEventListener('DOMContentLoaded', function () {
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

        // Create a FormData object to hold the file data
        const formData = new FormData();
        formData.append('file', file);

        // Send the file to the web service endpoint
        // Use a CORS proxy for development purposes
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = 'https://dataaccess-portal-poc-file-upload.onrender.com/upload/';

        fetch(proxyUrl + targetUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('File uploaded successfully:', data);
            messageContainer.textContent = 'File uploaded successfully!';
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            messageContainer.textContent = 'Error uploading file: ' + error.message;
        });

    });
});
  