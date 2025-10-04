 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

    const firebaseConfig = {
      apiKey: "AIzaSyDAu-9P8Lo3giJ9hFBiDR6T5eM0NuUnJoQ",
      authDomain: "ai-health-web.firebaseapp.com",
      projectId: "ai-health-web",
      storageBucket: "ai-health-web.appspot.com",
      messagingSenderId: "504572356636",
      appId: "1:504572356636:web:2002a4ebab9474177ad7d9",
      measurementId: "G-MZ4Z3ZDJ9R"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const analytics = getAnalytics(app);

    const profileBtn = document.getElementById('profileBtn');
    const profileText = document.getElementById('profileText');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutLink = document.getElementById('logoutLink');

    // Get references to the new navigation links
    const navChatLink = document.getElementById('navChatLink');
    const navMetricsLink = document.getElementById('navMetricsLink');
    const navMedicineLink = document.getElementById('navMedicineLink');

    // Get references to the new feature card links and their indicators
    const featureChatLink = document.getElementById('featureChatLink');
    const featureMetricsLink = document.getElementById('featureMetricsLink');
    const featureMedicineLink = document.getElementById('featureMedicineLink');
    const featureProfileLink = document.getElementById('featureProfileLink'); // This one is already linked to profile.html

    let isLoggedIn = false;

    function updateProfileUI(user) {
      // Ensure all elements exist before trying to manipulate them
      if (!profileBtn || !profileText || !profileDropdown || !logoutLink || !navChatLink || !navMetricsLink || !navMedicineLink || !featureChatLink || !featureMetricsLink || !featureMedicineLink || !featureProfileLink) {
        console.warn("One or more profile UI elements not found. Skipping UI update.");
        return;
      }

      if (user) {
        isLoggedIn = true;
        profileText.textContent = 'My Profile';
        profileBtn.onclick = null;
        profileBtn.classList.add('logged-in');
        profileDropdown.classList.remove('hidden');
        logoutLink.style.display = 'block';

        // Set 'premium' feature links to their actual pages
        navChatLink.href = '/templates/chat.html';
        navMetricsLink.href = '/templates/health_plan.html';
        navMedicineLink.href = 'medicine_check.html';
        featureChatLink.href = '/templates/chat.html';
        featureMetricsLink.href = '/templates/health_plan.html';
        featureMedicineLink.href = 'medicine_check.html';
        featureProfileLink.href = 'profile.html'; // Ensure profile link is correct

        // Hide login required indicators
        document.querySelectorAll('.login-required-indicator').forEach(el => el.classList.add('hidden'));

      } else {
        isLoggedIn = false;
        profileText.textContent = 'Login / Sign Up';
        profileBtn.onclick = () => { window.location.href = 'sign_up.html'; return false; };
        profileBtn.classList.remove('logged-in');
        profileDropdown.classList.add('hidden');
        logoutLink.style.display = 'none';

        // Set 'premium' feature links to the signup page
        navChatLink.href = '/templates/sign_up.html';
        navMetricsLink.href = '/templates/sign_up.html';
        navMedicineLink.href = '/templates/sign_up.html';
        featureChatLink.href = '/templates/sign_up.html';
        featureMetricsLink.href = 'sign_up.html';
        featureMedicineLink.href = 'sign_up.html';
        featureProfileLink.href = 'sign_up.html'; // Redirect profile link to signup if not logged in

        // Show login required indicators
        document.querySelectorAll('.login-required-indicator').forEach(el => el.classList.remove('hidden'));
      }
    }

    // Listen for authentication state changes to update the UI
    onAuthStateChanged(auth, (user) => {
      updateProfileUI(user);
    });

    // Event listener for the profile button to toggle dropdown or navigate
    if (profileBtn) {
      profileBtn.addEventListener('click', (event) => {
        if (isLoggedIn) {
          event.stopPropagation(); // Prevent click from bubbling to window and closing dropdown immediately
          profileDropdown.classList.toggle('hidden');
        }
        // If not logged in, the onclick attribute set by updateProfileUI will handle navigation
      });
    }

    // Event listener for logout link
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          alert('You have been logged out.'); // Consider a custom modal instead of alert for better UX
        } catch (error) {
          console.error("Error signing out:", error);
          alert('Failed to log out. Please try again.'); // Consider a custom modal
        }
      });
    }
document.addEventListener("DOMContentLoaded", () => {
    // ... your existing scripts ...

    const videoContainers = document.querySelectorAll('#updates .group');

    videoContainers.forEach(container => {
        const video = container.querySelector('video');

        container.addEventListener('mouseenter', () => {
            if (video) {
                video.play();
            }
        });

        container.addEventListener('mouseleave', () => {
            if (video) {
                video.pause();
                video.currentTime = 0; // Rewind the video to the beginning
            }
        });
    });
});
    // Close dropdown if clicked outside
    window.addEventListener('click', (event) => {
      if (
        isLoggedIn &&
        profileDropdown && // Ensure dropdown element exists
        !profileBtn.contains(event.target) &&
        !profileDropdown.contains(event.target)
      ) {
        profileDropdown.classList.add('hidden');
      }
    });