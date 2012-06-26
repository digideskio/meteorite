var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var spawn = require('child_process').spawn;
var rm_rf = require('rimraf');
var Package = require('./package').Package;

Installer = function() {
  this._parseDeps();
  this._findMeteoriteDir();
  this._prepareFS();
};

Installer.prototype.run = function(fn) {
  var self = this;
  
  var preparedCount = 0;
  var _prepared = function() {
    preparedCount++;
    if (preparedCount >= _.keys(self.deps).length)
      fn();
  };

  var preparePackages = function() {
    _.each(self.deps, function(config, name) {
      var package = new Package({
        name: name,
        root: self.meteoriteDir,
        repo: self._parseRepoConfig(config)
      });

      package.prepare(function() {
        var packagePath = path.join(package.path, 'src', name);
        self._linkPackage(name, packagePath, _prepared);
      });
    });
  };
  
  this._findMeteor(function() {
    preparePackages();
  });
};

Installer.prototype._parseRepoConfig = function(config) {
  return {
    checkout: 'branch',
    head: config.branch || config.ref || config.tag || 'master',
    url: config.git
  };
};

Installer.prototype._linkPackage = function(name, linkPath, fn) {
  var packageDir = path.join(path.dirname(this.meteorPath), 'packages', name);
  var realPath;
  try {
    realPath = fs.readlinkSync(packageDir)
  } catch(e) {}
  
  if (realPath)
    rm_rf(packageDir, function() {
      fs.symlinkSync(linkPath, packageDir);
      fn();
    });

};

Installer.prototype._parseDeps = function() {
  var projectPath = process.cwd();
  var configPath = path.join(projectPath, 'depend.json');
  try {
    var rawConfig = fs.readFileSync(configPath).toString();
    this.deps = JSON.parse(rawConfig);
  } catch(e) {}
};

Installer.prototype._findMeteor = function(fn) {
  var self = this;
  var meteorPath;
  var whichMeteor = spawn('which', ['meteor']);

  whichMeteor.stdout.on('data', function (data) {
    self.meteorPath = data.toString().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    fn();
  });
};

Installer.prototype._findMeteoriteDir = function() {
  var homeDir = process.env.HOME;
  this.meteoriteDir = path.join(homeDir, '.meteorite');
};

Installer.prototype._prepareFS = function() {
  if (!path.existsSync(this.meteoriteDir))
    fs.mkdir(this.meteoriteDir);
};

module.exports = Installer;