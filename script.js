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
        })
        .catch(error => {
            console.error('Error:', error);
            displayResponse('error', 'Error submitting data: ' + error.message);
        });
});