const themeStyle = document.createElement('link');
themeStyle.rel = 'stylesheet';
themeStyle.href = '/theme.css?v=1';
document.head.append(themeStyle);
const themeScript = document.createElement('script');
themeScript.src = '/theme.js?v=1';
document.head.append(themeScript);

const adminScript = document.createElement('script');
adminScript.src = '/assets/js/admin.js';
adminScript.async = false;
document.head.append(adminScript);
