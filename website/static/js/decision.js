// Add click event listeners to all .decision elements
const decisions = document.querySelectorAll('.decision');
const optionLists = document.querySelectorAll('.options');

decisions.forEach((decision, index) => {
    decision.addEventListener('click', () => {
        // Toggle the visibility of the corresponding options list
        const options = optionLists[index];
        const isVisible = options.style.display === 'block';
        options.style.display = isVisible ? 'none' : 'block';
    });
});

optionLists.forEach((options, index) => {
    const decision = decisions[index];

    // Add click event listener to each list item
    options.addEventListener('click', (event) => {
        if (event.target.tagName === 'LI') {
            // When an option is clicked, hide the options list
            options.style.display = 'none';
        }
    });
});
