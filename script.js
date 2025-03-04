document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('dataForm');
    const fileUpload = document.getElementById('file_upload');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.querySelector('.file-name');
    const uploadDateField = document.getElementById('upload_date');
    const fileSizeField = document.getElementById('file_size');

    // Create a message container for form submission feedback
    const messageContainer = document.createElement('div');
    messageContainer.id = 'submission-message';
    messageContainer.className = 'submission-message';
    messageContainer.style.display = 'none';

    // Insert the message container after the form
    if (form) {
        form.insertAdjacentElement('afterend', messageContainer);
    }

    // Initialize form with default values
    initializeFormDefaults();

    function initializeFormDefaults() {
        // Set current date as upload date
        const today = new Date();
        if (uploadDateField) {
            uploadDateField.value = today.toISOString().split('T')[0];
        }

        // Set capture date to today
        const captureDate = today.toISOString().split('T')[0];

        // Set expire date to 3 months in the future
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + 3);
        const expireDateStr = expireDate.toISOString().split('T')[0];

        // Debug: Log all form fields to find the correct IDs
        console.log("Form fields found:");
        document.querySelectorAll('#dataForm input, #dataForm select, #dataForm textarea').forEach(field => {
            console.log(`Field: ${field.id || 'no-id'}, Name: ${field.name || 'no-name'}, Type: ${field.type || 'no-type'}`);
        });

        // Check if capture_date field exists
        const captureDateField = document.getElementById('captured_date');
        if (captureDateField) {
            console.log("Capture date field found, setting value to:", captureDate);
            captureDateField.value = captureDate;
        } else {
            console.warn("Capture date field not found with ID 'capture_date'");
        }

        // Check if expire_date field exists
        const expireDateField = document.getElementById('expire_date');
        if (expireDateField) {
            console.log("Expire date field found, setting value to:", expireDateStr);
            expireDateField.value = expireDateStr;
        } else {
            console.warn("Expire date field not found with ID 'expire_date'");
        }

        // Set other default values if needed
        const defaultFields = {
            'file_name': 'File1.pdf',
            'file_format': 'PDF',
            'short_description': 'Test upload of PDF data',
            'long_description': '',
            'tags': 'tag1,tag2,tag3',
            'owner': 'Data Collection Owner',
            'data_type': 'PDF',
            'capture_date': captureDate,
            'expire_date': expireDateStr
        };

        for (const [fieldId, defaultValue] of Object.entries(defaultFields)) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = defaultValue;
            } else {
                console.warn(`Field not found with ID: ${fieldId}`);
            }
        }
    }
    // File upload handling
    if (fileUpload) {
        fileUpload.addEventListener('change', handleFileSelect);
    }

    // Drag and drop functionality
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', function (e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.remove('dragover');

            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length) {
                fileUpload.files = files;
                handleFileSelect();
            }
        });
    }

    function handleFileSelect() {
        if (fileUpload.files.length > 0) {
            const file = fileUpload.files[0];
            if (fileName) {
                fileName.textContent = file.name;
            }
            if (fileInfo) {
                fileInfo.style.display = 'block';
            }

            // Display file size
            const size = file.size;
            let sizeStr;

            if (size < 1024) {
                sizeStr = size + ' bytes';
            } else if (size < 1024 * 1024) {
                sizeStr = (size / 1024).toFixed(2) + ' KB';
            } else {
                sizeStr = (size / (1024 * 1024)).toFixed(2) + ' MB';
            }

            if (fileSizeField) {
                fileSizeField.value = sizeStr;
            }
        }
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

            // Hide message after 8 seconds (increased from 5 seconds to give users more time to read)
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
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            // Updated Elasticsearch URL
            const elasticsearchUrl = 'https://my-elasticsearch-project-d2bcb4.es.us-east-1.aws.elastic.cloud:443/pc-data-access-idx-000001/_doc';

            console.log('Sending request to:', proxyUrl + elasticsearchUrl);

            fetch(proxyUrl + elasticsearchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'ApiKey bFhqM1lKVUJWM0R0WUMtaWNDWHE6aF92MDZfelNqeFM5N1UtMXZuTjVLdw=='
                },
                body: JSON.stringify(jsonData)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.json();
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

                    // Reset map
                    if (window.resetMap && typeof window.resetMap === 'function') {
                        window.resetMap();
                    }

                    // Reset default values
                    initializeFormDefaults();
                })
                .catch(error => {
                    displayError(error);
                });
        });
    }
});











