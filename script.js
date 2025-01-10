document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const signupScreen = document.getElementById('signup-screen');
    const mainMenuScreen = document.getElementById('main-menu-screen');
    const transactionsScreen = document.getElementById('transactions-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const viewTransactionsBtn = document.getElementById('view-transactions-btn');
    const viewSettingsBtn = document.getElementById('view-settings-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const transactionsTable = document.getElementById('transactions-table');
    const backButtons = document.querySelectorAll('.back-btn');
    const logoutButtons = document.querySelectorAll('.logout-btn');
    const profileForm = document.getElementById('profile-form');

    let users = []; // User storage
    let loggedInUser = null; // Currently logged-in user reference

    function showScreen(screen) {
        const screens = [loginScreen, signupScreen, mainMenuScreen, transactionsScreen, settingsScreen];
        screens.forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // Function to fetch data from Google Sheets
    function fetchTransactions() {
        const apiKey = 'AIzaSyAVm_K-H1nRU_Ve2VqwpqD13H4rQTaT3FU'; // Your API key
        const sheetId = '1k_TPTjTE1NPgLFCgsfsV1zjbSuNwh92qn3erodl_5bE'; // Your Google Sheet ID
        const range = 'Transactions!A:E'; // Adjust the range according to your sheet structure
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
                        <td>${t[0]}</td>
                        <td>${t[1]}</td>
                        <td>${t[2]}</td>
                        <td>${t[3]}</td>
                    `;
                    transactionsTable.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="4">No transactions found.</td>`;
                transactionsTable.appendChild(row);
            }
        } catch (error) {
            alert('Error fetching transactions: ' + error.message);
        }
    }

    // Event listeners for navigation and functionality
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
