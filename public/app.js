const appScript = document.createElement('script');
appScript.src = '/assets/js/app.js?v=6';
appScript.async = false;
appScript.onload = () => {
  const dateFilter = document.createElement('script');
  dateFilter.src = '/date-filter.js?v=1';
  document.head.append(dateFilter);
  const tableControls = document.createElement('script');
  tableControls.src = '/table-controls.js?v=10';
  tableControls.onload = () => {
    const rowLocks = document.createElement('script');
    rowLocks.src = '/row-locks.js?v=5';
    rowLocks.onload = () => {
      const callLinks = document.createElement('script');
      callLinks.src = '/call-links.js?v=5';
      document.head.append(callLinks);
    };
    document.head.append(rowLocks);
  };
  document.head.append(tableControls);
};
document.head.append(appScript);
