// Set default date for captured_date and format the upload_date with current date and time
window.addEventListener('DOMContentLoaded', function () {
    // Set captured_date to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    document.getElementById('captured_date').value = formattedDate;

    // Set upload_date to current date and time in a readable format
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    document.getElementById('upload_date').value = formattedDateTime;

    // Set default values for form fields
    document.getElementById('file_name').value = 'File1.pdf';
    document.getElementById('file_format').value = 'PDF';
    document.getElementById('short_description').value = 'Test upload of PDF data';
    document.getElementById('tags').value = 'tag1,tag2,tag3';
    document.getElementById('owner').value = 'Data Collection Owner';
    document.getElementById('data_type').value = 'PDF';
    // File upload handling
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file_upload');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.querySelector('.file-name');

    if (fileUploadArea && fileInput) {
        // Handle file selection via browse button
        fileInput.addEventListener('change', function (e) {
            const file = this.files[0];
            if (file) {
                displayFileInfo(file);
            }
        });

        // Handle drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, unhighlight, false);
        });

        fileUploadArea.addEventListener('drop', handleDrop, false);

        // Click on the upload area to trigger file input
        fileUploadArea.addEventListener('click', function (e) {
            if (e.target !== fileInput && !e.target.classList.contains('browse-btn')) {
                fileInput.click();
            }
        });
    }
});

// Function to display response messages
function displayResponse(type, message) {
    const responseElement = document.getElementById('response');
    responseElement.textContent = message;
    responseElement.className = 'response ' + type;
    responseElement.style.display = 'block';

    // Scroll to response
    responseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Hide after 5 seconds
    setTimeout(() => {
        responseElement.style.opacity = '0';
        setTimeout(() => {
            responseElement.style.display = 'none';
            responseElement.style.opacity = '1';
        }, 500);
    }, 5000);
}

// File upload helper functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    document.getElementById('file-upload-area').classList.add('dragover');
}

function unhighlight() {
    document.getElementById('file-upload-area').classList.remove('dragover');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];

    // Check if file is a zip
    if (file && file.name.toLowerCase().endsWith('.zip')) {
        document.getElementById('file_upload').files = dt.files;
        displayFileInfo(file);
    } else {
        alert('Please upload a ZIP file only.');
    }
}

function displayFileInfo(file) {
    if (file.name.toLowerCase().endsWith('.zip')) {
        document.querySelector('.file-name').textContent = file.name;
        document.querySelector('.file-info').style.display = 'block';

        // Update file size in the display field
        const fileSizeField = document.getElementById('file_size');
        fileSizeField.value = formatFileSize(file.size);

        // Update upload date in the display field
        const uploadDateField = document.getElementById('upload_date');
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        uploadDateField.value = formattedDateTime;

        // Update file name and format based on the uploaded file
        document.getElementById('file_name').value = file.name;
        const fileExtension = file.name.split('.').pop().toUpperCase();
        document.getElementById('file_format').value = fileExtension;
    } else {
        alert('Please upload a ZIP file only.');
        document.getElementById('file_upload').value = '';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

document.getElementById('dataForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Handle form data
    const formData = new FormData(this);
    const data = {};

    // Convert FormData to JSON object
    formData.forEach((value, key) => {
        // Handle tags as an array
        if (key === 'tags' && value) {
            data[key] = value.split(',').map(tag => tag.trim());
        } else {
            data[key] = value;
        }
    });

    // Format dates properly for Elasticsearch
    if (data.captured_date) {
        data.captured_date = data.captured_date + 'T00:00:00Z';
    }
    // Upload date is already formatted as text, but we'll convert it to ISO format for the API
    if (data.upload_date) {
        const uploadDate = new Date(data.upload_date.replace(' ', 'T'));
        data.upload_date = uploadDate.toISOString();
    }
    if (data.expire_date) {
        data.expire_date = data.expire_date + 'T00:00:00Z';
    }

    // Handle file upload if a file was selected
    const fileInput = document.getElementById('file_upload');
    const file = fileInput.files[0];
    if (file) {
        // In a real application, you would upload the file to S3 here
        // For now, we'll simulate the upload and generate a fake S3 URL
        const fakeS3Url = `https://example-bucket.s3.amazonaws.com/uploads/${file.name}`;
        document.getElementById('storage_url').value = fakeS3Url;

        // Add the storage URL to the data object
        data.storage_url = fakeS3Url;

        // Add file name to the data object if not already set
        if (!data.file_name) {
            data.file_name = file.name;
        }

        // Extract file format from file name if not already set
        if (!data.file_format) {
            const fileExtension = file.name.split('.').pop().toUpperCase();
            data.file_format = fileExtension;
        }
    }

    // Elasticsearch API endpoint
    const elasticsearchUrl = 'https://my-elasticsearch-project-d2bcb4.es.us-east-1.aws.elastic.cloud:443/pc-data-access-idx-000001/_doc';

    // API Key for authentication
    const apiKey = 'bFhqM1lKVUJWM0R0WUMtaWNDWHE6aF92MDZfelNqeFM5N1UtMXZuTjVLdw==';

    // Display loading message
    displayResponse('info', 'Submitting data to Elasticsearch...');

    // For debugging - log the data being sent
    console.log('Sending data to Elasticsearch:', JSON.stringify(data, null, 2));

    // Send data to Elasticsearch with improved error handling
    fetch(elasticsearchUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${apiKey}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(`Elasticsearch error: ${JSON.stringify(errorData)}`);
            }).catch(e => {
                // If we can't parse the error as JSON
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(result => {
        console.log('Elasticsearch response:', result);
        displayResponse('success', 'Data successfully submitted to Elasticsearch!');

        // Reset form
        document.getElementById('dataForm').reset();

        // Reset captured_date to current date after form reset
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        document.getElementById('captured_date').value = formattedDate;

        // Reset upload_date to current date and time
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        document.getElementById('upload_date').value = formattedDateTime;

        // Reset default values for form fields
        document.getElementById('file_name').value = 'File1.pdf';
        document.getElementById('file_format').value = 'PDF';
        document.getElementById('short_description').value = 'Test upload of PDF data';
        document.getElementById('tags').value = 'tag1,tag2,tag3';
        document.getElementById('owner').value = 'Data Collection Owner';
        document.getElementById('data_type').value = 'PDF';

        // Clear file upload area
        document.querySelector('.file-info').style.display = 'none';
        document.getElementById('file_size').value = '';
        document.getElementById('storage_url').value = '';
    })
    .catch(error => {
        console.error('Error:', error);

        // Provide more detailed error information
        let errorMessage = 'Error submitting data to Elasticsearch: ';

        if (error.message === 'Failed to fetch') {
            errorMessage += 'Could not connect to the Elasticsearch server. This could be due to CORS restrictions, network issues, or incorrect API endpoint. Check your browser console for more details.';
        } else {
            errorMessage += error.message;
        }

        displayResponse('error', errorMessage);

        // For testing purposes, you might want to simulate a successful submission
        // Comment out the following line in production
        // displayResponse('success', 'Data submission simulated for testing (actual submission failed)');
    });
});







