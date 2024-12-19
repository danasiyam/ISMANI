document.querySelector('.toggle-btn').addEventListener('click', function() {
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenu.classList.toggle('show');
});

// Close the mobile menu when clicking on login
document.querySelector('.mobile-menu .login-btn').addEventListener('click', function() {
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenu.classList.remove('show');
});
