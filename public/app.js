const appScript = document.createElement('script');
appScript.src = '/assets/js/app.js?v=2';
appScript.async = false;
appScript.onload = () => {
  const tableControls = document.createElement('script');
  tableControls.src = '/table-controls.js?v=4';
  tableControls.onload = () => {
    const rowLocks = document.createElement('script');
    rowLocks.src = '/row-locks.js?v=1';
    document.head.append(rowLocks);
  };
  document.head.append(tableControls);
};
document.head.append(appScript);
