(function () {
    var STORAGE_KEY = 'pulsepoint-saved';
    var MAX_SAVED = 200;

    function getAll() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function save(all) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }

    function isSaved(link) {
        return getAll().some(function (a) { return a.link === link; });
    }

    function toggle(article) {
        var all = getAll();
        var idx = -1;
        for (var i = 0; i < all.length; i++) {
            if (all[i].link === article.link) { idx = i; break; }
        }
        if (idx >= 0) {
            all.splice(idx, 1);
            save(all);
            return false;
        } else {
            all.unshift({
                title: article.title,
                link: article.link,
                source: article.source,
                summary: article.summary || '',
                savedAt: new Date().toISOString()
            });
            if (all.length > MAX_SAVED) all.pop();
            save(all);
            return true;
        }
    }

    function removeAll() {
        localStorage.removeItem(STORAGE_KEY);
    }

    window.PulsePointBookmarks = {
        getAll: getAll,
        isSaved: isSaved,
        toggle: toggle,
        removeAll: removeAll
    };
})();
