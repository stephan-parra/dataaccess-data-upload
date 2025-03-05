document.addEventListener('DOMContentLoaded', function() {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file_upload');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.querySelector('.file-name');
    const uploadDateField = document.getElementById('upload_date');
    const fileSizeField = document.getElementById('file_size');
    const fileNameField = document.getElementById('file_name');
    const fileFormatField = document.getElementById('file_format');

    // Define allowed file extensions
    const allowedExtensions = ['pdf', 'zip', 'geotiff', 'tiff', 'png', 'jpeg', 'jpg', 'avi'];

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        fileUploadArea.classList.add('highlight');
    }

    function unhighlight() {
        fileUploadArea.classList.remove('highlight');
    }

    // Handle dropped files
    fileUploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFiles(files);
        }
    }

    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const fileExtension = getFileExtension(file.name).toLowerCase();

            // Check if file extension is allowed
            if (allowedExtensions.includes(fileExtension)) {
                // Update file info display
                fileInfo.style.display = 'block';
                fileName.textContent = file.name;

                // Set upload date (current date)
                const now = new Date();
                const formattedDate = now.toISOString().split('T')[0];
                uploadDateField.value = formattedDate;

                // Set file size
                fileSizeField.value = formatFileSize(file.size);

                // Auto-populate file name field with full filename including extension
                fileNameField.value = file.name;

                // Auto-populate file format field
                fileFormatField.value = fileExtension.toUpperCase();
            } else {
                alert('Invalid file type. Please upload a PDF, ZIP, GeoTIFF, TIFF, PNG, JPEG, JPG, or AVI file.');
                fileInput.value = ''; // Clear the file input
                fileInfo.style.display = 'none';
            }
        }
    }

    function getFileExtension(filename) {
        return filename.split('.').pop();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});


