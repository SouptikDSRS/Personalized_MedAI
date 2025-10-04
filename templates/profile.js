console.log("Profile page: Firebase SDK script loading..."); // Debugging
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js"; // Added for Analytics

    const firebaseConfig = {
      apiKey: "AIzaSyDAu-9P8Lo3giJ9hFBiDR6T5eM0NuUnJoQ",
      authDomain: "ai-health-web.firebaseapp.com",
      projectId: "ai-health-web",
      storageBucket: "ai-health-web.firebasestorage.app",
      messagingSenderId: "504572356636",
      appId: "1:504572356636:web:2002a4ebab9474177ad7d9",
      measurementId: "G-MZ4Z3ZDJ9R"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const analytics = getAnalytics(app); // Initialized Analytics

    console.log("Profile page: Firebase app, auth, db, analytics initialized."); // Debugging

    window.auth = auth;
    window.db = db;
    window.onAuthStateChanged = onAuthStateChanged;
    window.doc = doc;
    window.getDoc = getDoc;
    window.setDoc = setDoc;
    window.updateDoc = updateDoc;
// Needed for initial profile creation if it doesn't exist

    const profileForm = document.getElementById('profileForm');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const formActions = document.getElementById('formActions');
    const profileNameDisplay = document.getElementById('profileNameDisplay');
    const profileEmailDisplay = document.getElementById('profileEmailDisplay');

    // All input fields
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    const genderInput = document.getElementById('gender');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const bmiInput = document.getElementById('bmi');
    const activityLevelInput = document.getElementById('activityLevel');
    const healthGoalsInput = document.getElementById('healthGoals');
    const allergiesInput = document.getElementById('allergies');
    const preExistingConditionsInput = document.getElementById('preExistingConditions');
    const lastUpdatedInput = document.getElementById('lastUpdated');

    let currentUserData = null; // Will store fetched user data

    function calculateBMI(heightCm, weightKg) {
      if (heightCm > 0 && weightKg > 0) {
        const heightM = heightCm / 100;
        return (weightKg / (heightM * heightM)).toFixed(2);
      }
      return 'N/A';
    }

    async function fetchAndPopulateProfileData(user) {
      console.log("fetchAndPopulateProfileData called for user:", user ? user.uid : "null"); // Debugging: Check if function is called and user exists
      if (!user) {
        console.log("No user found, redirecting to sign_up.html"); // Debugging
        window.location.href = 'sign_up.html'; // Relative path
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      console.log("Attempting to get user document from Firestore:", userDocRef.path); // Debugging
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          console.log("User document found:", userDocSnap.data()); // Debugging
          currentUserData = userDocSnap.data();
          currentUserData.bmi = calculateBMI(currentUserData.height, currentUserData.weight);

          profileNameDisplay.textContent = currentUserData.fullName || 'N/A';
          profileEmailDisplay.textContent = currentUserData.email || user.email;

          fullNameInput.value = currentUserData.fullName || '';
          emailInput.value = currentUserData.email || user.email;
          dateOfBirthInput.value = currentUserData.dateOfBirth || '';
          genderInput.value = currentUserData.gender || '';
          heightInput.value = currentUserData.height || '';
          weightInput.value = currentUserData.weight || '';
          bmiInput.value = currentUserData.bmi;
          activityLevelInput.value = currentUserData.activityLevel || '';
          healthGoalsInput.value = currentUserData.healthGoals || '';
          allergiesInput.value = currentUserData.allergies || '';
          preExistingConditionsInput.value = currentUserData.preExistingConditions || '';
          lastUpdatedInput.value = currentUserData.lastUpdated || 'N/A';

          // Manually trigger floating label active state for pre-filled inputs and selects/textareas
          document.querySelectorAll('.input-group input, .input-group select, .input-group textarea').forEach(input => {
            if (input.tagName === 'SELECT') {
                if (input.value !== '') {
                    const label = input.nextElementSibling;
                    if (label && label.tagName === 'LABEL') {
                        label.classList.add('active');
                    }
                }
            } else if (input.value !== '') {
                const label = input.nextElementSibling;
                if (label && label.tagName === 'LABEL') {
                    label.classList.add('active');
                }
            }
          });

        } else {
          console.warn("No user profile found in Firestore for UID:", user.uid, "Creating a new one."); // Debugging
          // If no profile exists, create a basic one based on auth data with new fields as null
          currentUserData = {
            fullName: user.displayName || 'New User',
            email: user.email,
            dateOfBirth: null,
            gender: null,
            height: null,
            weight: null,
            activityLevel: null,
            healthGoals: null,
            allergies: null,
            preExistingConditions: null,
            lastUpdated: new Date().toISOString().slice(0, 10)
          };
          await setDoc(userDocRef, currentUserData);
          console.log("New user profile created in Firestore."); // Debugging
          fetchAndPopulateProfileData(user); // Re-run to populate with newly created defaults
        }
      } catch (error) {
        console.error("Error fetching or creating user data:", error); // Debugging: More specific error
        alert("Failed to load profile data. Please try again."); // Use custom modal
      }
      toggleEditMode(false); // Always start in view mode
    }

    function toggleEditMode(isEditing) {
      const editableInputs = [
        fullNameInput, dateOfBirthInput, genderInput,
        heightInput, weightInput, activityLevelInput,
        healthGoalsInput, allergiesInput, preExistingConditionsInput
      ];

      editableInputs.forEach(input => {
        input.disabled = !isEditing;
        input.readOnly = !isEditing;
        input.style.backgroundColor = isEditing ? '#ffffff' : '#e9ecef';
      });

      // Email, BMI, Last Updated are display-only
      emailInput.disabled = true;
      bmiInput.disabled = true;
      lastUpdatedInput.disabled = true;

      if (isEditing) {
        formActions.classList.remove('hidden');
        editProfileBtn.classList.add('hidden');
      } else {
        formActions.classList.add('hidden');
        editProfileBtn.classList.remove('hidden');
      }
    }

    editProfileBtn.addEventListener('click', () => {
      toggleEditMode(true);
    });

    cancelEditBtn.addEventListener('click', () => {
      // Revert changes and exit edit mode
      if (currentUserData) {
        // Re-populate with original fetched data
        fullNameInput.value = currentUserData.fullName || '';
        dateOfBirthInput.value = currentUserData.dateOfBirth || '';
        genderInput.value = currentUserData.gender || '';
        heightInput.value = currentUserData.height || '';
        weightInput.value = currentUserData.weight || '';
        activityLevelInput.value = currentUserData.activityLevel || '';
        healthGoalsInput.value = currentUserData.healthGoals || '';
        allergiesInput.value = currentUserData.allergies || '';
        preExistingConditionsInput.value = currentUserData.preExistingConditions || '';
        bmiInput.value = calculateBMI(currentUserData.height, currentUserData.weight); // Recalculate BMI
        lastUpdatedInput.value = currentUserData.lastUpdated || '';

        // Re-apply floating labels
        document.querySelectorAll('.input-group input, .input-group select, .input-group textarea').forEach(input => {
            const label = input.nextElementSibling;
            if (label && label.tagName === 'LABEL') {
                if (input.tagName === 'SELECT' && input.value === '') { // Specific for selects with empty initial option
                    label.classList.remove('active');
                } else if (input.value === '') {
                    label.classList.remove('active');
                } else {
                    label.classList.add('active');
                }
            }
        });
      }
      toggleEditMode(false);
    });

    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to save changes."); // Use custom modal
        window.location.href = 'sign_up.html'; // Relative path
        return;
      }

      const updatedData = {
        fullName: fullNameInput.value.trim(),
        dateOfBirth: dateOfBirthInput.value,
        gender: genderInput.value,
        height: parseFloat(heightInput.value) || null,
        weight: parseFloat(weightInput.value) || null,
        activityLevel: activityLevelInput.value,
        healthGoals: healthGoalsInput.value.trim(),
        allergies: allergiesInput.value.trim(),
        preExistingConditions: preExistingConditionsInput.value.trim(),
        lastUpdated: new Date().toISOString().slice(0, 10)
      };

      // Basic validation for numbers
      if (updatedData.height !== null && (isNaN(updatedData.height) || updatedData.height <= 0)) {
        alert('Please enter a valid positive number for Height.');
        return;
      }
      if (updatedData.weight !== null && (isNaN(updatedData.weight) || updatedData.weight <= 0)) {
        alert('Please enter a valid positive number for Weight.');
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, updatedData);
        alert('Profile updated successfully!'); // Replace with custom modal
        // Re-fetch and populate data to ensure UI is updated with latest from Firestore
        await fetchAndPopulateProfileData(user);
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to save profile changes. Please try again."); // Use custom modal
      }
    });

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
      console.log("onAuthStateChanged triggered. User:", user ? user.uid : "null"); // Debugging
      if (user) {
        // User is signed in, fetch and display their profile data
        fetchAndPopulateProfileData(user);
      } else {
        // User is signed out, redirect to login page
        console.log("No user logged in, redirecting to sign_up.html"); // Debugging
        window.location.href = 'sign_up.html'; // Relative path
      }
    });