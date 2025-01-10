document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const signupScreen = document.getElementById('signup-screen');
    const mainMenuScreen = document.getElementById('main-menu-screen');
    const transactionsScreen = document.getElementById('transactions-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const analysisScreen = document.getElementById('analysis-screen');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const viewTransactionsBtn = document.getElementById('view-transactions-btn');
    const viewSettingsBtn = document.getElementById('view-settings-btn');
    const viewAnalysisBtn = document.getElementById('view-analysis-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const transactionsTable = document.getElementById('transactions-table');
    const backButtons = document.querySelectorAll('.back-btn');
    const logoutButtons = document.querySelectorAll('.logout-btn');
    const profileForm = document.getElementById('profile-form');

    let users = []; // User storage
    let loggedInUser = null; // Currently logged-in user reference

    // Variables to store chart instances
    let transactionTypeDoughnutChartInstance = null;
    let quantityLineChartInstance = null;
    let accumulatedQuantityLineChartInstance = null;
    let quantityByItemBarChartInstance = null;
    let quantityByLocationBarChartInstance = null;
    let quantityByItemWithTransactionTypeInstance = null;
    let quantityByLocationWithTransactionTypeInstance = null;

    function showScreen(screen) {
        const screens = [loginScreen, signupScreen, mainMenuScreen, transactionsScreen, settingsScreen, analysisScreen];
        screens.forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // Function to fetch data from Google Sheets
    function fetchTransactions() {
        const apiKey = 'AIzaSyAVm_K-H1nRU_Ve2VqwpqD13H4rQTaT3FU'; // Your API key
        const sheetId = '1k_TPTjTE1NPgLFCgsfsV1zjbSuNwh92qn3erodl_5bE'; // Your Google Sheet ID
        const range = 'Transactions!A:G'; // Range includes columns A to G
        const timestamp = new Date().getTime(); // Prevent caching
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}&t=${timestamp}`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText).values);
                    } else {
                        reject(new Error(`Error fetching data: ${xhr.statusText}`));
                    }
                }
            };
            xhr.send();
        });
    }

    // Function to populate transactions table
    async function populateTransactions() {
        try {
            const transactions = await fetchTransactions();
            transactionsTable.innerHTML = ''; // Clear the table

            if (transactions && transactions.length > 0) {
                transactions.slice(1).forEach(t => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${t[0]}</td> <!-- Date -->
                        <td>${t[1]}</td> <!-- Location -->
                        <td>${t[2]}</td> <!-- Item -->
                        <td>${t[3]}</td> <!-- Transaction Type -->
                        <td>${t[4]}</td> <!-- Serial Number -->
                        <td>${t[5]}</td> <!-- Manufacture Date -->
                        <td>${t[6]}</td> <!-- Expiry Date -->
                    `;
                    transactionsTable.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7">No transactions found.</td>`;
                transactionsTable.appendChild(row);
            }
        } catch (error) {
            alert('Error fetching transactions: ' + error.message);
        }
    }

    // Function to destroy existing charts
    function destroyCharts() {
        if (transactionTypeDoughnutChartInstance) {
            transactionTypeDoughnutChartInstance.destroy();
            transactionTypeDoughnutChartInstance = null;
        }
        if (quantityLineChartInstance) {
            quantityLineChartInstance.destroy();
            quantityLineChartInstance = null;
        }
        if (accumulatedQuantityLineChartInstance) {
            accumulatedQuantityLineChartInstance.destroy();
            accumulatedQuantityLineChartInstance = null;
        }
        if (quantityByItemBarChartInstance) {
            quantityByItemBarChartInstance.destroy();
            quantityByItemBarChartInstance = null;
        }
        if (quantityByLocationBarChartInstance) {
            quantityByLocationBarChartInstance.destroy();
            quantityByLocationBarChartInstance = null;
        }
        if (quantityByItemWithTransactionTypeInstance) {
            quantityByItemWithTransactionTypeInstance.destroy();
            quantityByItemWithTransactionTypeInstance = null;
        }
        if (quantityByLocationWithTransactionTypeInstance) {
            quantityByLocationWithTransactionTypeInstance.destroy();
            quantityByLocationWithTransactionTypeInstance = null;
        }
    }

    // Function to render doughnut chart with gradient colors
    async function renderTransactionTypeDoughnutChart() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        const transactionTypes = data.map(t => t[3]); // Transaction Type column
        const typeCounts = {};
        transactionTypes.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const ctx = document.getElementById('transactionTypeDoughnutChart').getContext('2d');

        // Create gradient colors
        const gradientColors = [
            createGradient(ctx, '#36A2EB', '#4BC0C0'), // Blue to Mint gradient for Check In
            createGradient(ctx, '#FF6384', '#FF9F40')  // Red to Orange gradient for Check Out
        ];

        // Store the chart instance
        transactionTypeDoughnutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: gradientColors, // Use gradient colors
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Transaction Type Distribution'
                    }
                }
            }
        });
    }

    // Helper function to create gradient colors
    function createGradient(ctx, color1, color2) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Vertical gradient
        gradient.addColorStop(0, color1); // Start color
        gradient.addColorStop(1, color2); // End color
        return gradient;
    }

    // Function to render the quantity line chart
    async function renderQuantityLineChart() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Manufacture Date for Check In and Check Out
        const dateCheckInMap = {};
        const dateCheckOutMap = {};

        data.forEach(transaction => {
            const date = transaction[5]; // Manufacture Date column
            const transactionType = transaction[3]; // Transaction Type column

            if (!date) {
                console.warn('Missing Manufacture Date for transaction:', transaction);
                return; // Skip transactions with missing dates
            }

            if (transactionType === "Check In") {
                if (!dateCheckInMap[date]) {
                    dateCheckInMap[date] = 0;
                }
                dateCheckInMap[date] += 1; // Increment quantity for Check In
            } else if (transactionType === "Check Out") {
                if (!dateCheckOutMap[date]) {
                    dateCheckOutMap[date] = 0;
                }
                dateCheckOutMap[date] += 1; // Increment quantity for Check Out
            }
        });

        // Sort dates in ascending order
        const sortedDates = Object.keys({ ...dateCheckInMap, ...dateCheckOutMap }).sort((a, b) => new Date(a) - new Date(b));

        // Prepare data for the chart
        const labels = sortedDates; // X-axis: Manufacture Dates
        const checkInQuantities = sortedDates.map(date => dateCheckInMap[date] || 0); // Y-axis: Check In Quantities
        const checkOutQuantities = sortedDates.map(date => dateCheckOutMap[date] || 0); // Y-axis: Check Out Quantities

        const ctx = document.getElementById('quantityLineChart').getContext('2d');

        // Store the chart instance
        quantityLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Quantity Checked In',
                        data: checkInQuantities,
                        borderColor: '#36A2EB', // Blue for Check In
                        backgroundColor: 'rgba(54, 162, 235, 0.2)', // Light blue fill
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'Quantity Checked Out',
                        data: checkOutQuantities,
                        borderColor: '#FF6384', // Red for Check Out
                        backgroundColor: 'rgba(255, 99, 132, 0.2)', // Light red fill
                        borderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quantity Checked In and Out Over Time'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Manufacture Date'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: false,
                            padding: 5
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Function to render the accumulated quantity line chart
    async function renderAccumulatedQuantityLineChart() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Date for Check In and Check Out
        const dateCheckInMap = {};
        const dateCheckOutMap = {};

        data.forEach(transaction => {
            const date = transaction[0]; // Date column (column A)
            const transactionType = transaction[3]; // Transaction Type column

            if (!date) {
                console.warn('Missing Date for transaction:', transaction);
                return; // Skip transactions with missing dates
            }

            if (transactionType === "Check In") {
                if (!dateCheckInMap[date]) {
                    dateCheckInMap[date] = 0;
                }
                dateCheckInMap[date] += 1; // Increment quantity for Check In
            } else if (transactionType === "Check Out") {
                if (!dateCheckOutMap[date]) {
                    dateCheckOutMap[date] = 0;
                }
                dateCheckOutMap[date] += 1; // Increment quantity for Check Out
            }
        });

        // Sort dates in ascending order
        const sortedDates = Object.keys({ ...dateCheckInMap, ...dateCheckOutMap }).sort((a, b) => new Date(a) - new Date(b));

        // Calculate accumulated quantities
        let accumulatedCheckIn = 0;
        let accumulatedCheckOut = 0;
        const accumulatedCheckInQuantities = [];
        const accumulatedCheckOutQuantities = [];

        sortedDates.forEach(date => {
            accumulatedCheckIn += dateCheckInMap[date] || 0;
            accumulatedCheckOut += dateCheckOutMap[date] || 0;
            accumulatedCheckInQuantities.push(accumulatedCheckIn);
            accumulatedCheckOutQuantities.push(accumulatedCheckOut);
        });

        const ctx = document.getElementById('accumulatedQuantityLineChart').getContext('2d');

        // Store the chart instance
        accumulatedQuantityLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: sortedDates.length }, (_, i) => i + 1), // Use index as labels (1, 2, 3, ...)
                datasets: [
                    {
                        label: 'Accumulated Check In',
                        data: accumulatedCheckInQuantities,
                        borderColor: '#4BC0C0', // Teal for Accumulated Check In
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Light teal fill
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'Accumulated Check Out',
                        data: accumulatedCheckOutQuantities,
                        borderColor: '#FF9F40', // Orange for Accumulated Check Out
                        backgroundColor: 'rgba(255, 159, 64, 0.2)', // Light orange fill
                        borderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Accumulated Quantity Checked In and Out Over Time'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Transaction Sequence'
                        },
                        ticks: {
                            display: false // Hide x-axis labels
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Accumulated Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Function to render the quantity by item bar chart with unique colors
    async function renderQuantityByItemBarChart() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Item
        const itemCounts = {};
        data.forEach(transaction => {
            const item = transaction[2]; // Item column
            if (!item) return; // Skip if item is missing
            itemCounts[item] = (itemCounts[item] || 0) + 1; // Increment count for the item
        });

        const ctx = document.getElementById('quantityByItemBarChart').getContext('2d');

        // Define a color palette for items
        const itemColors = [
            '#36A2EB', // Blue
            '#FF6384', // Red
            '#4BC0C0', // Teal
            '#FF9F40', // Orange
            '#9966FF', // Purple
            '#00CC99', // Green
            '#FF66B2', // Pink
        ];

        // Assign a unique color to each item
        const backgroundColor = Object.keys(itemCounts).map((_, index) => {
            return itemColors[index % itemColors.length]; // Cycle through the palette
        });

        // Store the chart instance
        quantityByItemBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(itemCounts), // Item names
                datasets: [{
                    label: 'Quantity by Item',
                    data: Object.values(itemCounts), // Quantities
                    backgroundColor: backgroundColor, // Use unique colors
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quantity by Item'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Item'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Function to render the quantity by location bar chart with unique colors
    async function renderQuantityByLocationBarChart() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Location
        const locationCounts = {};
        data.forEach(transaction => {
            const location = transaction[1]; // Location column
            if (!location) return; // Skip if location is missing
            locationCounts[location] = (locationCounts[location] || 0) + 1; // Increment count for the location
        });

        const ctx = document.getElementById('quantityByLocationBarChart').getContext('2d');

        // Define a color palette for locations
        const locationColors = [
            '#00CC99', // Green
            '#9966FF', // Purple
            '#FF66B2', // Pink
            '#36A2EB', // Blue
            '#FF6384', // Red
            '#4BC0C0', // Teal
            '#FF9F40', // Orange
        ];

        // Assign a unique color to each location
        const backgroundColor = Object.keys(locationCounts).map((_, index) => {
            return locationColors[index % locationColors.length]; // Cycle through the palette
        });

        // Store the chart instance
        quantityByLocationBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(locationCounts), // Location names
                datasets: [{
                    label: 'Quantity by Location',
                    data: Object.values(locationCounts), // Quantities
                    backgroundColor: backgroundColor, // Use unique colors
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quantity by Location'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Location'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Function to render the quantity by item bar chart with Check In/Check Out split
    async function renderQuantityByItemWithTransactionType() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Item and Transaction Type
        const itemCheckInCounts = {};
        const itemCheckOutCounts = {};

        data.forEach(transaction => {
            const item = transaction[2]; // Item column
            const transactionType = transaction[3]; // Transaction Type column

            if (!item) return; // Skip if item is missing

            if (transactionType === "Check In") {
                if (!itemCheckInCounts[item]) {
                    itemCheckInCounts[item] = 0;
                }
                itemCheckInCounts[item] += 1; // Increment count for Check In
            } else if (transactionType === "Check Out") {
                if (!itemCheckOutCounts[item]) {
                    itemCheckOutCounts[item] = 0;
                }
                itemCheckOutCounts[item] += 1; // Increment count for Check Out
            }
        });

        const ctx = document.getElementById('quantityByItemWithTransactionType').getContext('2d');

        // Define a color palette for Check In and Check Out
        const checkInColor = '#36A2EB'; // Blue for Check In
        const checkOutColor = '#FF6384'; // Red for Check Out

        // Get all unique items
        const items = Object.keys({ ...itemCheckInCounts, ...itemCheckOutCounts });

        // Store the chart instance
        quantityByItemWithTransactionTypeInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: items, // Item names
                datasets: [
                    {
                        label: 'Check In',
                        data: items.map(item => itemCheckInCounts[item] || 0), // Quantities for Check In
                        backgroundColor: checkInColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Check Out',
                        data: items.map(item => itemCheckOutCounts[item] || 0), // Quantities for Check Out
                        backgroundColor: checkOutColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quantity by Item (Check In vs Check Out)'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Item'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Function to render the quantity by location bar chart with Check In/Check Out split
    async function renderQuantityByLocationWithTransactionType() {
        const transactions = await fetchTransactions();
        const data = transactions.slice(1); // Remove header row

        // Group data by Location and Transaction Type
        const locationCheckInCounts = {};
        const locationCheckOutCounts = {};

        data.forEach(transaction => {
            const location = transaction[1]; // Location column
            const transactionType = transaction[3]; // Transaction Type column

            if (!location) return; // Skip if location is missing

            if (transactionType === "Check In") {
                if (!locationCheckInCounts[location]) {
                    locationCheckInCounts[location] = 0;
                }
                locationCheckInCounts[location] += 1; // Increment count for Check In
            } else if (transactionType === "Check Out") {
                if (!locationCheckOutCounts[location]) {
                    locationCheckOutCounts[location] = 0;
                }
                locationCheckOutCounts[location] += 1; // Increment count for Check Out
            }
        });

        const ctx = document.getElementById('quantityByLocationWithTransactionType').getContext('2d');

        // Define a color palette for Check In and Check Out
        const checkInColor = '#36A2EB'; // Blue for Check In
        const checkOutColor = '#FF6384'; // Red for Check Out

        // Get all unique locations
        const locations = Object.keys({ ...locationCheckInCounts, ...locationCheckOutCounts });

        // Store the chart instance
        quantityByLocationWithTransactionTypeInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: locations, // Location names
                datasets: [
                    {
                        label: 'Check In',
                        data: locations.map(location => locationCheckInCounts[location] || 0), // Quantities for Check In
                        backgroundColor: checkInColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Check Out',
                        data: locations.map(location => locationCheckOutCounts[location] || 0), // Quantities for Check Out
                        backgroundColor: checkOutColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quantity by Location (Check In vs Check Out)'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Location'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email-login').value.trim();
        const password = document.getElementById('password-login').value.trim();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            loggedInUser = user;
            showScreen(mainMenuScreen);
        } else {
            alert('Invalid login credentials. Please try again.');
        }
    });

    document.getElementById('show-signup-btn').addEventListener('click', () => showScreen(signupScreen));
    signupBtn.addEventListener('click', () => {
        const username = document.getElementById('username-signup').value.trim();
        const email = document.getElementById('email-signup').value.trim();
        const password = document.getElementById('password-signup').value.trim();

        if (!username || !email || !password) {
            alert('All fields are required.');
            return;
        }

        if (users.some(u => u.email === email)) {
            alert('An account with this email already exists.');
        } else {
            users.push({ username, email, password });
            alert('Account created successfully!');
            showScreen(loginScreen);
        }
    });

    backToLoginBtn.addEventListener('click', () => showScreen(loginScreen));
    viewTransactionsBtn.addEventListener('click', () => {
        populateTransactions();
        showScreen(transactionsScreen);
    });

    viewSettingsBtn.addEventListener('click', () => {
        if (loggedInUser) {
            document.getElementById('username').value = loggedInUser.username;
            document.getElementById('password').value = loggedInUser.password;
            document.getElementById('role').value = loggedInUser.role || '';
            document.getElementById('country').value = loggedInUser.country || '';
        }
        showScreen(settingsScreen);
    });

    viewAnalysisBtn.addEventListener('click', () => {
        destroyCharts(); // Destroy existing charts
        renderTransactionTypeDoughnutChart();
        renderQuantityLineChart();
        renderAccumulatedQuantityLineChart();
        renderQuantityByItemBarChart();
        renderQuantityByLocationBarChart();
        renderQuantityByItemWithTransactionType(); // Render the new bar chart
        renderQuantityByLocationWithTransactionType(); // Render the new bar chart
        showScreen(analysisScreen);
    });

    backButtons.forEach(button => button.addEventListener('click', () => showScreen(mainMenuScreen)));
    logoutButtons.forEach(button => button.addEventListener('click', () => {
        alert('You have been logged out.');
        loggedInUser = null;
        showScreen(loginScreen);
    }));

    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (loggedInUser) {
            loggedInUser.username = document.getElementById('username').value.trim();
            loggedInUser.password = document.getElementById('password').value.trim();
            loggedInUser.role = document.getElementById('role').value.trim();
            loggedInUser.country = document.getElementById('country').value.trim();
            alert('Profile updated successfully!');
        } else {
            alert('Error: No user is currently logged in.');
        }
    });
});