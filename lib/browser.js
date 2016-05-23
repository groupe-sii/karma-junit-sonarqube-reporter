(function(window) {

  var currentFile;
  var originalResult = window.__karma__.result;

  window.__karma__.result = function(result) {
    if (currentFile) {
      result.filename = currentFile;
    }
    originalResult.call(window.__karma__, result);
  };

  window.__setCurrentFile = function(f) {
    currentFile = f;
  };
})(window);
