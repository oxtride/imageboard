export function generateUniqueId() {
    // A simple, non-cryptographic unique ID based on timestamp and a random number
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export function formatTimestamp(date) {
    const options = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
}

export function savePosts(posts) {
    localStorage.setItem('imageboard_posts', JSON.stringify(posts));
}

export function loadPosts() {
    try {
        const storedPosts = localStorage.getItem('imageboard_posts');
        let posts = storedPosts ? JSON.parse(storedPosts) : [];
        
        // Ensure 'posts' is an array. If not, initialize as empty.
        if (!Array.isArray(posts)) {
            console.warn("Stored posts are not an array, initializing as empty.");
            posts = [];
        }

        // Filter out any null, undefined, or non-object entries from the main threads array
        posts = posts.filter(post => post && typeof post === 'object' && !Array.isArray(post));

        // Further ensure each post (thread) has necessary properties with correct types
        posts.forEach(post => {
            // IMPORTANT: Ensure temporary display URLs ('displayImageUrl') are never loaded from persistence.
            // They are for current session display only.
            delete post.displayImageUrl;

            // Proactively clean up potentially large imageUrls from old data.
            // If imageUrl looks like a Data URL, clear it to prevent future QuotaExceededError.
            if (typeof post.imageUrl === 'string' && post.imageUrl.startsWith('data:image/')) {
                post.imageUrl = null; // Clear problematic large data
            }

            // Ensure replies array exists and contains valid objects
            if (!Array.isArray(post.replies)) {
                post.replies = [];
            } else {
                // Filter out any null, undefined, or non-object entries within replies
                post.replies = post.replies.filter(reply => {
                    if (reply && typeof reply === 'object' && !Array.isArray(reply)) {
                        delete reply.displayImageUrl; // Ensure this is never loaded
                        if (typeof reply.imageUrl === 'string' && reply.imageUrl.startsWith('data:image/')) {
                            reply.imageUrl = null; // Clear problematic large data from replies too
                        }
                        return true;
                    }
                    return false;
                });
            }
            
            // Ensure views property exists and is a number, default to 0 if missing or invalid
            if (typeof post.views !== 'number') {
                post.views = 0;
            }
        });

        return posts;
    } catch (e) {
        console.error("Error loading posts from localStorage:", e);
        // Clear potentially corrupted storage to prevent repeated errors
        localStorage.removeItem('imageboard_posts'); 
        return [];
    }
}