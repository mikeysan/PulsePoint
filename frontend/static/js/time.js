/**
 * Shared relative-time formatting for PulsePoint.
 *
 * The feed and the globe drawer render the same timestamps at different
 * widths, so the two presentations are kept as one function with a flag
 * rather than two implementations that drift apart.
 */
(function () {
    /**
     * Format a timestamp as elapsed time.
     *
     * @param {string} dateString - Any Date-parsable string.
     * @param {boolean} [compact] - Abbreviated units ("5m ago") for tight
     *   surfaces such as the globe drawer. Defaults to verbose ("5 mins ago").
     * @returns {string} Elapsed time, or an absolute date beyond a week.
     */
    function formatRelativeTime(dateString, compact) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const diffMs = new Date() - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';

            if (compact) {
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return date.toLocaleDateString();
            }

            if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    window.PulsePointTime = { formatRelativeTime: formatRelativeTime };
})();
