// 默认展开左侧导航树的所有节点
document.addEventListener('DOMContentLoaded', function() {
  // 等待导航加载完成
  const observer = new MutationObserver(function(mutations, obs) {
    const nav = document.querySelector('.site-menu');
    if (nav) {
      // 展开所有 details 元素
      const details = nav.querySelectorAll('details');
      details.forEach(function(detail) {
        detail.setAttribute('open', '');
      });
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 备用：延迟执行
  setTimeout(function() {
    const details = document.querySelectorAll('.site-menu details');
    details.forEach(function(detail) {
      detail.setAttribute('open', '');
    });
  }, 500);
});
