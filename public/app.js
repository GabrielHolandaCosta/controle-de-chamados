const appScript = document.createElement('script');
appScript.src = '/assets/js/app.js';
appScript.async = false;
appScript.onload = () => {
  const tableControls = document.createElement('script');
  tableControls.src = '/table-controls.js?v=2';
  document.head.append(tableControls);
};
document.head.append(appScript);
