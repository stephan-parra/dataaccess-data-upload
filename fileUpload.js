document.addEventListener('DOMContentLoaded', function () {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file_upload');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.querySelector('.file-name');
    const uploadDateField = document.getElementById('data_upload_date');
    const fileSizeField = document.getElementById('file_size');
    const fileNameField = document.getElementById('file_name');
    const fileFormatField = document.getElementById('file_format');
    const form = document.getElementById('dataForm');

    // Create a message container for form submission feedback
    const messageContainer = document.createElement('div');
    messageContainer.id = 'submission-message';
    messageContainer.className = 'submission-message';
    messageContainer.style.display = 'none';

    // Insert the message container after the form
    if (form) {
        form.insertAdjacentElement('afterend', messageContainer);
    }
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
    fileInput.addEventListener('change', function () {
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

    // Function to display response
    function displayResponse(response) {
        console.log('Response received:', response);

        // Update message container instead of using alert
        if (messageContainer) {
            if (response && response._id) {
                // Create a more detailed success message
                const successHTML = `
                    <div class="success-details">
                        <h3><i class="fas fa-check-circle"></i> Upload Successful!</h3>
                        <p><strong>Document ID:</strong> ${response._id}</p>
                        <p><strong>Index:</strong> ${response._index || 'pc-data-access-idx-000001'}</p>
                        <p><strong>Created:</strong> ${response.result === 'created' ? 'Yes' : 'No'}</p>
                        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                        <p>Your data has been successfully uploaded to the Data Access Portal.</p>
                    </div>
                `;
                messageContainer.innerHTML = successHTML;
                messageContainer.className = 'submission-message success';
            } else {
                messageContainer.innerHTML = `
                    <div class="success-details">
                        <h3><i class="fas fa-check-circle"></i> Upload Successful!</h3>
                        <p>Your data has been successfully uploaded to the Data Access Portal.</p>
                        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                `;
                messageContainer.className = 'submission-message success';
            }
            messageContainer.style.display = 'block';

            // Hide message after 8 seconds
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 8000);
        } else {
            // Fallback to alert if message container doesn't exist
            if (response && response._id) {
                alert(`Upload Successful!\nDocument ID: ${response._id}\nIndex: ${response._index || 'pc-data-access-idx-000001'}\nCreated: ${response.result === 'created' ? 'Yes' : 'No'}\nTimestamp: ${new Date().toLocaleString()}`);
            } else {
                alert(`Upload Successful!\nYour data has been successfully uploaded to the Data Access Portal.\nTimestamp: ${new Date().toLocaleString()}`);
            }
        }
    }

    // Function to display error
    function displayError(error) {
        console.error('Error:', error);

        // Update message container instead of using alert
        if (messageContainer) {
            messageContainer.textContent = 'Error submitting data: ' + error.message;
            messageContainer.className = 'submission-message error';
            messageContainer.style.display = 'block';

            // Hide message after 5 seconds
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert if message container doesn't exist
            alert('Error submitting data: ' + error.message);
        }
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(form);
            const jsonData = {};

            formData.forEach((value, key) => {
                const element = document.querySelector(`[name="${key}"]`);
                // Skip empty values except for required fields
                if (value || (element && element.hasAttribute('required'))) {
                    jsonData[key] = value;
                }
            });

            // Add WKT data if available (but don't make it mandatory)
            const wktOutput = document.getElementById('wkt_output');
            if (wktOutput && wktOutput.value) {
                jsonData.wkt = wktOutput.value;
                // Map WKT value to geo_location_area field for Elasticsearch
                jsonData.geo_location_area = wktOutput.value;
            }

            // Add timestamp
            jsonData.timestamp = new Date().toISOString();

            // Convert tags to array if present
            if (jsonData.tags) {
                jsonData.tags = jsonData.tags.split(',').map(tag => tag.trim());
            }

            console.log('Submitting data:', jsonData);

            // Submit to Elasticsearch via CORS proxy
            // Submit to the web service endpoint via CORS proxy
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            // Updated web service URL
            const webServiceUrl = 'https://dataaccess-portal-poc-submit-elastic.onrender.com/submit/';

            console.log('Sending request to:', proxyUrl + webServiceUrl);

            // Prepare the JSON payload with the required structure
            const payload = {
                data: jsonData
            };
            fetch(webServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(response => {
                    const contentType = response.headers.get('content-type');
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    } else {
                        return response.text().then(text => {
                            throw new Error('Expected JSON, but received: ' + text);
                        });
                    }
                })
                .then(data => {
                    console.log('Success:', data);
                    displayResponse(data);

                    // Reset form
                    form.reset();
                    if (fileInfo) {
                        fileInfo.style.display = 'none';
                    }
                    if (wktOutput) {
                        wktOutput.value = '';
                    }

                    // Reset map if the function exists
                    if (window.resetMap && typeof window.resetMap === 'function') {
                        window.resetMap();
                    }
                })
                .catch(error => {
                    console.error('Error submitting to web service:', error);
                    displayError(error);

                    // Check if the error is related to CORS
                    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                        displayError({
                            message: 'CORS error: Please ensure you have temporary access to the demo server. Visit https://cors-anywhere.herokuapp.com/ and request temporary access.'
                        });
                    }
                });


        });
    }

    // Add a check for WKT data before submission
    if (form) {
        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.addEventListener('click', function (e) {
                const wktOutput = document.getElementById('wkt_output');
                const wktErrorMessage = document.getElementById('wkt_error_message') || createWktErrorMessage();

                // If WKT is required but not provided, prevent form submission
                if (wktOutput && !wktOutput.value && wktOutput.hasAttribute('required')) {
                    e.preventDefault();
                    // Show error message instead of alert
                    wktErrorMessage.textContent = 'Please draw a polygon on the map or enter a WKT string before submitting.';
                    wktErrorMessage.style.display = 'block';
                    wktOutput.classList.add('error-border');
                    return false;
                } else {
                    // Hide error message if WKT is provided
                    wktErrorMessage.style.display = 'none';
                    wktOutput.classList.remove('error-border');
                }
            });
        }
    }

    // Function to create error message element if it doesn't exist
    function createWktErrorMessage() {
        const wktOutput = document.getElementById('wkt_output');
        const errorMessage = document.createElement('div');
        errorMessage.id = 'wkt_error_message';
        errorMessage.style.color = 'red';
        errorMessage.style.fontSize = '14px';
        errorMessage.style.marginTop = '5px';
        errorMessage.style.display = 'none';

        // Insert the error message after the WKT output field
        if (wktOutput && wktOutput.parentNode) {
            wktOutput.parentNode.insertBefore(errorMessage, wktOutput.nextSibling);
        }

        return errorMessage;
    }

});




