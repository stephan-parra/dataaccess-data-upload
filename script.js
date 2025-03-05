document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('dataForm');
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
        const uploadDateField = document.getElementById('upload_date');
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

        // Set default WKT polygon for Auckland area
        const wktField = document.getElementById('geo_location_area');
        if (wktField) {
            wktField.value = "POLYGON((174.76385325193405 -36.84773110369033, 174.76348847150808 -36.84848662911965, 174.7625657916069 -36.84821618621595, 174.762935936451 -36.84741773015693, 174.76385325193405 -36.84773110369033))";
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

    // Form submission handler
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validate form fields
            if (!validateForm()) {
                return;
            }

            // Get form data
            const formData = new FormData(form);
            const jsonData = {};

            // Convert FormData to JSON
            for (const [key, value] of formData.entries()) {
                // Special handling for geo_location_area to ensure it's properly mapped
                if (key === 'geo_location_area') {
                    jsonData[key] = value.trim();
                } else {
                    jsonData[key] = value;
                }
            }

            // Ensure WKT field is included
            const wktField = document.getElementById('geo_location_area');
            if (wktField && wktField.value) {
                jsonData.geo_location_area = wktField.value.trim();
            }

            console.log('Submitting data:', jsonData);

            // Submit data to ElasticSearch
            submitToElasticSearch(jsonData);
        });
    }

    // Function to validate form
    function validateForm() {
        // Check required fields
        const requiredFields = ['file_name', 'file_format', 'short_description', 'owner', 'data_type'];
        let isValid = true;

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                showError(`Please fill in the ${fieldId.replace('_', ' ')} field.`);
                isValid = false;
                break;
            }
        }

        // Check if file is selected
        const fileUpload = document.getElementById('file_upload');
        if (isValid && (!fileUpload || !fileUpload.files[0])) {
            showError('Please select a file to upload.');
            isValid = false;
        }

        return isValid;
    }

    // Function to show error messages
    function showError(message) {
        messageContainer.textContent = message;
        messageContainer.className = 'submission-message error';
        messageContainer.style.display = 'block';

        // Scroll to message
        messageContainer.scrollIntoView({ behavior: 'smooth' });

        // Hide message after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    // Function to submit data to ElasticSearch
    function submitToElasticSearch(data) {
        // Placeholder for ElasticSearch submission
        console.log('Submitting to ElasticSearch:', data);

        // Show success message
        messageContainer.textContent = 'Data submitted successfully!';
        messageContainer.className = 'submission-message success';
        messageContainer.style.display = 'block';

        // Scroll to message
        messageContainer.scrollIntoView({ behavior: 'smooth' });

        // Hide message after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
});












