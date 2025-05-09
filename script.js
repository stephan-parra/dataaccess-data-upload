document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('dataForm');
        if (form) {
            const formElements = form.elements;
            for (let i = 0; i < formElements.length; i++) {
                formElements[i].disabled = true;
            }
        }
    });
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
        const uploadDateField = document.getElementById('data_upload_date');
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
        const captureDateField = document.getElementById('data_captured_date');
        if (captureDateField) {
            console.log("Capture date field found, setting value to:", captureDate);
            captureDateField.value = captureDate;
        } else {
            console.warn("Capture date field not found with ID 'data_captured_date'");
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
            'short_description': 'Subsurface Utility Survey',
            'long_description': 'Ground Penetrating Radar survey data of subsurface utilities in central Auckland.',
            'tags': 'tag1,tag2,tag3',
            'owner': 'Data Collection Owner',
            'data_type': 'PDF',
            'captured_date': captureDate,
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
        });
    }

    // Function to validate form
    function validateForm() {
        // Check required fields
        const requiredFields = ['file_name', 'file_format', 'short_description', 'data_owner_company_name', 'data_type'];
        let isValid = true;

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                showError(`Please fill in the "${fieldId.replace(/_/g, ' ')}" field.`);
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

        // Check if WKT field is filled
        const wktField = document.getElementById('geo_location_area');
        if (isValid && (!wktField || !wktField.value.trim())) {
            // Instead of showing a general error, highlight the WKT field
            showWktError('Please draw a polygon on the map to define the area of interest');
            isValid = false;
        } else if (wktField) {
            // Clear any previous error styling
            clearWktError();
        }

        // Validate price field if it exists
        const priceField = document.getElementById('price');
        if (isValid && priceField && priceField.value.trim() && !validatePrice(priceField.value.trim())) {
            showError('Please enter a valid price with up to 2 decimal places.');
            isValid = false;
        }
        return isValid;
    }

    // Function to show WKT-specific error
    function showWktError(message) {
        const wktField = document.getElementById('geo_location_area');
        if (wktField) {
            // Add error class to the textarea
            wktField.classList.add('error');

            // Check if error message element already exists
            let errorElement = document.getElementById('wkt-error-message');
            if (!errorElement) {
                // Create error message element
                errorElement = document.createElement('div');
                errorElement.id = 'wkt-error-message';
                errorElement.className = 'validation-error';
                errorElement.style.color = 'red';
                errorElement.style.fontSize = '0.9em';
                errorElement.style.marginTop = '5px';

                // Insert after the WKT textarea
                wktField.insertAdjacentElement('afterend', errorElement);
            }

            errorElement.textContent = message;
            errorElement.style.display = 'block';

            // Scroll to the WKT field
            wktField.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Function to clear WKT error
    function clearWktError() {
        const wktField = document.getElementById('geo_location_area');
        if (wktField) {
            wktField.classList.remove('error');

            const errorElement = document.getElementById('wkt-error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    }

    // Add this function to validate the price field
    // Update the validatePrice function to properly handle decimal values
    // Update the validatePrice function to properly handle decimal values
    function validatePrice(price) {
        // Allow empty price (optional field)
        if (!price) return true;

        // Convert to number and check if it's valid
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return false;

        // Check if it's a positive number
        if (numPrice < 0) return false;
        // Check if it has at most 2 decimal places
        const decimalStr = price.toString().split('.');
        if (decimalStr.length > 1 && decimalStr[1].length > 2) {
            return false;
        }

        return true;
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
});













