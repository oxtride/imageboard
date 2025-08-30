import { generateUniqueId, formatTimestamp, savePosts, loadPosts } from 'utils';

const postForm = document.getElementById('post-form');
const imageUpload = document.getElementById('image-upload');
const postText = document.getElementById('post-text');
const threadsContainer = document.getElementById('threads-container');
const threadTemplate = document.getElementById('thread-template');
const replyTemplate = document.getElementById('reply-template');

const threadsView = document.getElementById('threads-view');
const catalogView = document.getElementById('catalog-view');
const threadsNav = document.getElementById('threads-nav');
const catalogNav = document.getElementById('catalog-nav');
const catalogContainer = document.getElementById('catalog-container');
const catalogItemTemplate = document.getElementById('catalog-item-template');

// 'posts' is now 'threads' to reflect the structure where each item is a thread with replies.
let threads = loadPosts();

// Function to create and return a reply element from the template
function createReplyElement(reply) {
    const clone = document.importNode(replyTemplate.content, true);
    const replyElement = clone.querySelector('.reply');

    replyElement.querySelector('.id-value').textContent = reply.id;
    replyElement.querySelector('.reply-timestamp').textContent = formatTimestamp(new Date(reply.timestamp));

    const replyImage = replyElement.querySelector('.reply-image');
    // For client-side storage, actual image data is NOT persisted to avoid QuotaExceededError.
    // 'displayImageUrl' is a temporary URL for immediate display in the current session.
    // 'imageUrl' might exist for old, non-Data URL images (though now cleared by loadPosts if it was a Data URL).
    if (reply.displayImageUrl) { 
        replyImage.src = reply.displayImageUrl;
        replyImage.alt = `Image for reply ${reply.id}`;
        replyImage.style.display = 'block';
    } else if (reply.imageUrl) { // Fallback for any legacy, non-Data URL images
        replyImage.src = reply.imageUrl;
        replyImage.alt = `Image for reply ${reply.id}`;
        replyImage.style.display = 'block';
    } else {
        replyImage.style.display = 'none'; // Hide image if no URL
    }
    
    replyElement.querySelector('.reply-text').textContent = reply.text;

    return replyElement;
}

// Function to create and return a thread element from the template
function createThreadElement(thread) {
    const clone = document.importNode(threadTemplate.content, true);
    const threadElement = clone.querySelector('.thread');
    threadElement.id = `thread-${thread.id}`; // Add unique ID for easier targeting

    threadElement.querySelector('.id-value').textContent = thread.id;
    threadElement.querySelector('.thread-timestamp').textContent = formatTimestamp(new Date(thread.timestamp));
    
    // Update and display views
    threadElement.querySelector('.views-count').textContent = thread.views;

    const threadImage = threadElement.querySelector('.thread-image');
    // For client-side storage, actual image data is NOT persisted to avoid QuotaExceededError.
    // 'displayImageUrl' is a temporary URL for immediate display in the current session.
    // 'imageUrl' might exist for old, non-Data URL images (though now cleared by loadPosts if it was a Data URL).
    if (thread.displayImageUrl) { 
        threadImage.src = thread.displayImageUrl;
        threadImage.alt = `Image for thread ${thread.id}`;
        threadImage.style.display = 'block';
    } else if (thread.imageUrl) { // Fallback for any legacy, non-Data URL images
        threadImage.src = thread.imageUrl;
        threadImage.alt = `Image for thread ${thread.id}`;
        threadImage.style.display = 'block';
    } else {
        threadImage.style.display = 'none'; // Hide image if no URL
    }
    
    threadElement.querySelector('.thread-text').textContent = thread.text;

    // Render replies
    const repliesContainer = threadElement.querySelector('.replies-container');
    thread.replies.forEach(reply => {
        const replyElement = createReplyElement(reply);
        repliesContainer.append(replyElement);
    });

    // Handle reply form submission
    const replyForm = threadElement.querySelector('.reply-form');
    const replyImageUpload = replyForm.querySelector('.reply-image-upload');
    const replyText = replyForm.querySelector('.reply-text');

    replyForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const text = replyText.value.trim();
        const imageFile = replyImageUpload.files[0];

        if (!text && !imageFile) {
            alert('Please enter some text or upload an image for your reply.');
            return;
        }

        let tempDisplayImageUrl = null; // This will hold the URL.createObjectURL for immediate display

        if (imageFile) {
            // Create a temporary object URL for immediate display in the current session
            tempDisplayImageUrl = URL.createObjectURL(imageFile);
        }

        const newReply = {
            id: generateUniqueId(),
            timestamp: new Date().toISOString(),
            imageUrl: null, // IMPORTANT: Do NOT store image data in localStorage to avoid QuotaExceededError
            text: text,
            displayImageUrl: tempDisplayImageUrl // Temporary URL for current session display
        };

        // Find the thread in the global 'threads' array and add the reply
        const targetThread = threads.find(t => t.id === thread.id);
        if (targetThread) {
            targetThread.replies.push(newReply);
            savePosts(threads); // Save updated threads (without large imageUrls) to localStorage

            // Update only the replies section of this specific thread
            repliesContainer.innerHTML = ''; // Clear existing replies
            targetThread.replies.forEach(r => {
                const replyElem = createReplyElement(r);
                repliesContainer.append(replyElem);
            });
        }

        // Clear the reply form
        replyText.value = '';
        replyImageUpload.value = '';
    });

    return threadElement;
}

// Function to render all threads in the threads view
function renderThreads() {
    threadsContainer.innerHTML = ''; // Clear existing threads
    threads.forEach(thread => {
        // Increment views for threads rendered in the threads view
        thread.views = (thread.views || 0) + 1;
        const threadElement = createThreadElement(thread);
        threadsContainer.prepend(threadElement); // Add new threads to the top
    });
    savePosts(threads); // Save updated views (and importantly, without large image data)
}

// Function to create and return a catalog item element from the template
function createCatalogItemElement(thread) {
    const clone = document.importNode(catalogItemTemplate.content, true);
    const catalogItemElement = clone.querySelector('.catalog-item');

    catalogItemElement.querySelector('.id-value').textContent = thread.id;

    const catalogImage = catalogItemElement.querySelector('.catalog-image');
    // Similar logic for catalog: prefer displayImageUrl if available (current session), then legacy imageUrl, else hide
    if (thread.displayImageUrl) {
        catalogImage.src = thread.displayImageUrl;
        catalogImage.alt = `Image for thread ${thread.id}`;
        catalogImage.style.display = 'block';
    } else if (thread.imageUrl) {
        catalogImage.src = thread.imageUrl;
        catalogImage.alt = `Image for thread ${thread.id}`;
        catalogImage.style.display = 'block';
    } else {
        catalogImage.style.display = 'none'; 
    }
    
    const textSnippet = thread.text.length > 100 ? thread.text.substring(0, 97) + '...' : thread.text;
    catalogItemElement.querySelector('.catalog-text-snippet').textContent = textSnippet;

    catalogItemElement.addEventListener('click', () => {
        // Clear temporary displayImageUrl from all threads before switching view, as these are not persisted.
        // This ensures a consistent view upon returning, where images only show if just posted.
        threads.forEach(t => {
            delete t.displayImageUrl;
            t.replies.forEach(r => delete r.displayImageUrl);
        });
        showView('threads-view');
        // Find the thread element in the DOM based on its ID
        const targetThreadElement = document.getElementById(`thread-${thread.id}`); 
        if (targetThreadElement) {
            targetThreadElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetThreadElement.style.transition = 'background-color 0.5s ease';
            targetThreadElement.style.backgroundColor = '#ffffaa'; // Highlight
            setTimeout(() => {
                targetThreadElement.style.backgroundColor = '#fff'; // Revert
            }, 1500);
        }
    });

    return catalogItemElement;
}

// Function to render all threads in the catalog view
function renderCatalog() {
    catalogContainer.innerHTML = ''; // Clear existing catalog items
    threads.forEach(thread => {
        const catalogItemElement = createCatalogItemElement(thread);
        catalogContainer.prepend(catalogItemElement); // Add new items to the top
    });
}

// Function to switch between views
function showView(viewId) {
    // Hide all views
    threadsView.classList.add('hidden');
    catalogView.classList.add('hidden');

    // Remove active class from all nav links
    threadsNav.classList.remove('active');
    catalogNav.classList.remove('active');

    // Show the selected view and set active nav link
    if (viewId === 'threads-view') {
        threadsView.classList.remove('hidden');
        threadsNav.classList.add('active');
        renderThreads(); // Re-render threads when switching to threads view
    } else if (viewId === 'catalog-view') {
        catalogView.classList.remove('hidden');
        catalogNav.classList.add('active');
        renderCatalog(); // Re-render catalog when switching to catalog view
    }
}

// Handle new thread form submission
postForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = postText.value.trim();
    const imageFile = imageUpload.files[0];

    if (!text && !imageFile) {
        alert('Please enter some text or upload an image to start a thread.');
        return;
    }

    let tempDisplayImageUrl = null; // This will hold the URL.createObjectURL for immediate display

    if (imageFile) {
        // Create a temporary object URL for immediate display in the current session
        tempDisplayImageUrl = URL.createObjectURL(imageFile);
    }

    const newThread = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        imageUrl: null, // IMPORTANT: Do NOT store image data in localStorage to avoid QuotaExceededError
        text: text,
        views: 0, // Initialize views for a new thread
        replies: [], // Initialize replies array
        displayImageUrl: tempDisplayImageUrl // Temporary URL for current session display
    };

    threads.push(newThread);
    savePosts(threads); // Save updated threads (without large imageUrls) to localStorage
    
    // Re-render the current view to show the new thread with its temporary image
    const currentViewId = threadsNav.classList.contains('active') ? 'threads-view' : 'catalog-view';
    showView(currentViewId);

    // Clear the form
    postText.value = '';
    imageUpload.value = ''; // Clear file input
});

// Event listeners for navigation
threadsNav.addEventListener('click', (e) => {
    e.preventDefault();
    // Clear temporary displayImageUrl from all threads when navigating, as these are not persisted.
    // This ensures a consistent view upon returning, where images only show if just posted.
    threads.forEach(t => {
        delete t.displayImageUrl;
        t.replies.forEach(r => delete r.displayImageUrl);
    });
    showView('threads-view');
});

catalogNav.addEventListener('click', (e) => {
    e.preventDefault();
    threads.forEach(t => {
        delete t.displayImageUrl;
        t.replies.forEach(r => delete r.displayImageUrl);
    });
    showView('catalog-view');
});

// Initial render of threads when the page loads, starting with the threads view
showView('threads-view');