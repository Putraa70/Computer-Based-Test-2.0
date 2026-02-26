/**
 * Utility untuk mencegah copy-paste & screenshot saat SEB dinonaktifkan
 * Disable: right-click, Ctrl+C, Ctrl+X, Ctrl+A, drag & drop, text selection, screenshot
 */

export const enableAntiCopyProtection = () => {
    // 1. Disable right-click context menu
    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    // 2. Disable keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+A, Print Screen)
    const handleKeyDown = (e) => {
        // Ctrl+C / Cmd+C
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
        // Ctrl+X / Cmd+X (Cut)
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 88) {
            e.preventDefault();
            return false;
        }
        // Ctrl+A / Cmd+A (Select All) - optional, bisa dihapus jika ingin user bisa select
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 65) {
            e.preventDefault();
            return false;
        }
        // Print Screen (KeyCode 44)
        if (e.keyCode === 44) {
            e.preventDefault();
            return false;
        }
        // Fn+PrintScreen di Mac
        if ((e.metaKey || e.shiftKey) && e.keyCode === 16) {
            e.preventDefault();
            return false;
        }
    };

    // 3. Disable mouse right-click
    const handleMouseDown = (e) => {
        if (e.button === 2) {
            // Right mouse button
            e.preventDefault();
            return false;
        }
    };

    // 4. Disable drag and drop
    const handleDragStart = (e) => {
        e.preventDefault();
        return false;
    };

    // 5. Disable copy event
    const handleCopy = (e) => {
        e.preventDefault();
        return false;
    };

    // 6. Disable cut event
    const handleCut = (e) => {
        e.preventDefault();
        return false;
    };

    // 7. Disable paste event
    const handlePaste = (e) => {
        e.preventDefault();
        return false;
    };

    // 8. Disable Chrome DevTools detection & keyboard shortcuts
    const handleDevToolsKey = (e) => {
        // F12 - DevTools
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I - DevTools
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J - Console
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C - Element Inspector
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
    };

    // Tambah event listeners ke document
    document.addEventListener("contextmenu", handleContextMenu, false);
    document.addEventListener("keydown", handleKeyDown, false);
    document.addEventListener("keydown", handleDevToolsKey, false);
    document.addEventListener("mousedown", handleMouseDown, false);
    document.addEventListener("dragstart", handleDragStart, false);
    document.addEventListener("copy", handleCopy, false);
    document.addEventListener("cut", handleCut, false);
    document.addEventListener("paste", handlePaste, false);

    // Return cleanup function
    return () => {
        document.removeEventListener("contextmenu", handleContextMenu, false);
        document.removeEventListener("keydown", handleKeyDown, false);
        document.removeEventListener("keydown", handleDevToolsKey, false);
        document.removeEventListener("mousedown", handleMouseDown, false);
        document.removeEventListener("dragstart", handleDragStart, false);
        document.removeEventListener("copy", handleCopy, false);
        document.removeEventListener("cut", handleCut, false);
        document.removeEventListener("paste", handlePaste, false);
    };
};

/**
 * React Hook untuk anti-copy & anti-screenshot protection
 * Hanya aktif ketika SEB dinonaktifkan
 * Usage: useSecurityProtection(requireSeb) di component
 */
export const useSecurityProtection = (requireSeb) => {
    React.useEffect(() => {
        // Jika SEB diaktifkan, jangan aktifkan proteksi aplikasi
        if (requireSeb) {
            return;
        }

        // Jika SEB dinonaktifkan, aktifkan proteksi anti-copy & anti-screenshot
        const cleanup = enableAntiCopyProtection();
        return cleanup;
    }, [requireSeb]);
};
