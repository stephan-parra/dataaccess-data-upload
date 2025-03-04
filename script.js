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

    // File upload handling
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file_upload');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.querySelector('.file-name');

    if (fileUploadArea && fileInput) {
        // Handle file selection via browse button
        fileInput.addEventListener('change', function(e) {
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
        fileUploadArea.addEventListener('click', function(e) {
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

    // Get form data
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

    // Format dates properly
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

    // Handle file upload
    const fileInput = document.getElementById('file_upload');
    const file = fileInput.files[0];

    if (!file) {
        displayResponse('error', 'Please select a ZIP file to upload');
        return;
    }

    // In a real application, you would upload the file to S3 here
    // For now, we'll simulate the upload and generate a fake S3 URL
    const fakeS3Url = `https://example-bucket.s3.amazonaws.com/uploads/${file.name}`;
    document.getElementById('storage_url').value = fakeS3Url;

    // Add the storage URL to the data object
    data.storage_url = fakeS3Url;
    // Elasticsearch API endpoint - replace with your actual endpoint
    const apiUrl = '/api/submit-data'; // Replace with your actual API endpoint

    // Send data to backend
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            displayResponse('success', 'Data successfully submitted!');
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

            // Clear file upload area
            document.querySelector('.file-info').style.display = 'none';
            document.getElementById('file_size').value = '';
            document.getElementById('storage_url').value = '';
        })
        .catch(error => {
            console.error('Error:', error);
            displayResponse('error', 'Error submitting data: ' + error.message);
        });
});

