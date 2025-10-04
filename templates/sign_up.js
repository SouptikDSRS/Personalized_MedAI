import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { 
      getAuth, 
      createUserWithEmailAndPassword, 
      signInWithEmailAndPassword, 
      updateProfile 
    } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { 
      getFirestore, 
      doc, 
      setDoc 
    } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

    // Firebase configuration - Use your actual project details
    const firebaseConfig = {
      apiKey: "AIzaSyDAu-9P8Lo3giJ9hFBiDR6T5eM0NuUnJoQ",
      authDomain: "ai-health-web.firebaseapp.com",
      projectId: "ai-health-web",
      storageBucket: "ai-health-web.appspot.com",
      messagingSenderId: "504572356636",
      appId: "1:504572356636:web:2002a4ebab9474177ad7d9",
      measurementId: "G-MZ4Z3ZDJ9R"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const analytics = getAnalytics(app); // Initialize analytics

    // UI Element

    // Input Fields
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const signupNameInput = document.getElementById('signupName');
    const signupEmailInput = document.getElementById('signupEmail');
    const signupPasswordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Function to display messages with icons and styling
    function displayMessage(element, type, message, showSpinner = false) {
      element.classList.remove('hidden', 'success', 'error', 'loading');
      element.innerHTML = ''; // Clear previous content

      if (showSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        element.appendChild(spinner);
      }

      const icon = document.createElement('i');
      if (type === 'success') {
        icon.className = 'fas fa-check-circle mr-2';
      } else if (type === 'error') {
        icon.className = 'fas fa-times-circle mr-2';
      } else if (type === 'loading') {
        icon.className = 'fas fa-spinner fa-spin mr-2'; // Spinner icon for loading
      }
      element.appendChild(icon);

      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      element.appendChild(textSpan);
      element.classList.add(type);
      element.classList.remove('hidden');
    }

    // Tab switching logic
    function showTab(tabName) {
      if (tabName === 'login') {
        loginTabBtn.classList.add('active');
        signupTabBtn.classList.remove('active');
        loginFormSection.classList.remove('hidden');
        signupFormSection.classList.add('hidden');
      } else {
        signupTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        signupFormSection.classList.remove('hidden');
        loginFormSection.classList.add('hidden');
      }
      // Clear messages when switching tabs
      loginMessageDiv.classList.add('hidden');
      signupMessageDiv.classList.add('hidden');
    }

    loginTabBtn.addEventListener('click', () => showTab('login'));
    signupTabBtn.addEventListener('click', () => showTab('signup'));

    // Handle Login
    async function handleLogin(event) {
      event.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value;

      if (!email || !password) {
        displayMessage(loginMessageDiv, 'error', 'Please enter both email and password.');
        return;
      }

      displayMessage(loginMessageDiv, 'loading', 'Logging in...', true);

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        displayMessage(loginMessageDiv, 'success', 'Login successful! Redirecting...');
        console.log('User logged in:', user.uid);

        // Redirect to homepage after successful login
        setTimeout(() => {
          window.location.href = '/templates/index.html'; // Relative path
        }, 1500); // Give user a moment to see success message
      } catch (error) {
        let errorMessage = 'An unexpected error occurred.';
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          default:
            errorMessage = error.message;
            break;
        }
        displayMessage(loginMessageDiv, 'error', errorMessage);
        console.error('Login error:', error);
      }
    }

    // Handle Sign Up
    async function handleSignUp(event) {
      event.preventDefault();
      const name = signupNameInput.value.trim();
      const email = signupEmailInput.value.trim();
      const password = signupPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (!name || !email || !password || !confirmPassword) {
        displayMessage(signupMessageDiv, 'error', 'Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        displayMessage(signupMessageDiv, 'error', 'Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        displayMessage(signupMessageDiv, 'error', 'Passwords do not match.');
        return;
      }

      displayMessage(signupMessageDiv, 'loading', 'Signing up...', true);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set display name in Firebase Auth profile
        await updateProfile(user, { displayName: name });

        // Create user profile in Firestore with initial health-related fields as null
        await setDoc(doc(db, "users", user.uid), {
          fullName: name,
          email: email,
          dateOfBirth: null,
          gender: null,
          height: null,
          weight: null,
          activityLevel: null,
          healthGoals: null,
          allergies: null,
          preExistingConditions: null,
          lastUpdated: new Date().toISOString().slice(0, 10)
        });

        displayMessage(signupMessageDiv, 'success', 'Account created successfully! You can now log in.');
        console.log('User signed up and profile created:', user.uid);

        // Automatically switch to login tab after successful signup
        setTimeout(() => {
          showTab('login');
          // Clear signup form fields
          signupNameInput.value = '';
          signupEmailInput.value = '';
          signupPasswordInput.value = '';
          confirmPasswordInput.value = '';
        }, 1500); // Give user a moment to see success message
      } catch (error) {
        let errorMessage = 'An unexpected error occurred during sign up.';
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger one.';
            break;
          default:
            errorMessage = error.message;
            break;
        }
        displayMessage(signupMessageDiv, 'error', errorMessage);
        console.error('Sign up error:', error);
      }
    }

    // Expose handlers globally for form usage
    window.handleSignUp = handleSignUp;
    window.handleLogin = handleLogin;