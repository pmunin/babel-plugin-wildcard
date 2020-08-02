"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=_default;var _path2=_interopRequireDefault(require("path"));var _fs2=_interopRequireDefault(require("fs"));var _recursiveReaddirSync=_interopRequireDefault(require("recursive-readdir-sync"));function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}function _default(babel){var t=babel.types;return{visitor:{ImportDeclaration:function ImportDeclaration(path,state){//console.log(path);
var node=path.node,dec;var src=path.node.source.value;// Don't do anything if not a relative path
// if if not a relative path then a module
if(src[0]!=="."&&src[0]!=="/")return;var addWildcard=false,// True if should perform transform
wildcardName;// Name of the variable the wilcard will go in
// not set if you have a filter { A, B, C }
var filterNames=[];// e.g. A, B, C
// has a /* specifing explicitly to use wildcard
var wildcardRegex=/\/([^\/]*\*[^\/]*)$/;var isExplicitWildcard=wildcardRegex.test(src);var filenameRegex=new RegExp(".+");// in the above case we need to remove the trailing /*
if(isExplicitWildcard){var lastSlash=path.node.source.value.lastIndexOf("/");src=path.node.source.value.substring(0,lastSlash);var filenameGlob=path.node.source.value.substring(lastSlash+1);path.node.source.value=src;filenameRegex=filenameGlob.replace(/[*\.\(\[\)\]]/g,function(character){switch(character){case"*":return".*";case"(":case")":case"[":case"]":case".":return"\\"+character;}return character});filenameRegex=new RegExp(filenameRegex)}// Get current filename so we can try to determine the folder
var name=this.file.opts.parserOpts.sourceFileName||this.file.opts.parserOpts.filename;var files=[];var dir=_path2["default"].join(_path2["default"].dirname(name),src);// path of the target dir.
for(var i=node.specifiers.length-1;i>=0;i--){dec=node.specifiers[i];if(t.isImportNamespaceSpecifier(dec)&&_fs2["default"].existsSync(dir)&&!_fs2["default"].statSync(dir).isFile()){addWildcard=true;wildcardName=node.specifiers[i].local.name;node.specifiers.splice(i,1)}// This handles { A, B, C } from 'C/*'
if(t.isImportSpecifier(dec)&&isExplicitWildcard){// original: the actual name to lookup
// local: the name to import as, may be same as original
// We do this because of `import { A as B }`
filterNames.push({original:dec.imported.name,local:dec.local.name});addWildcard=true;// Remove the specifier
node.specifiers.splice(i,1)}}// All the extensions that we should look at
var exts=state.opts.exts||["js","es6","es","jsx"];if(addWildcard){// Add the original object. `import * as A from 'foo';`
//  this creates `const A = {};`
// For filters this will be empty anyway
if(filterNames.length===0){var obj=t.variableDeclaration("const",[t.variableDeclarator(t.identifier(wildcardName),t.objectExpression([]))]);path.insertBefore(obj)}// Will throw if the path does not point to a dir
try{files=(0,_recursiveReaddirSync["default"])(dir).map(function(file){return file.replace(dir+"/","")})// Handle shallow dependencies
.map(function(file){return file.replace(dir,"")}).filter(function(file){var _path$parse=_path2["default"].parse(file),name=_path$parse.name,ext=_path$parse.ext;return exts.indexOf(ext.substring(1))>-1&&filenameRegex.test(name)})}catch(e){console.warn("Wildcard for ".concat(name," points at ").concat(src," which is not a directory."));return}// This is quite a mess but it essentially formats the file
// extension, and adds it to the object
for(var i=0;i<files.length;i++){// name of temp. variable to store import before moved
// to object
var id=path.scope.generateUidIdentifier("wcImport");var file=files[i];var parts=file.split("/")// Set the fancy name based on options
.map(function(part){return getName(part,state.opts)})// Now we're 100% settled on the fancyName, if the user
// has provided a filter, we will check it:
.map(function(part){if(filterNames.length>0){// Find a filter name
var res=null;for(var j=0;j<filterNames.length;j++){if(filterNames[j].original===part){res=filterNames[j];break}}if(res===null)return null;return res.local}return part}).filter(function(part){return part!==null});// If after filtering we have no parts left then continue
if(parts.length===0)continue;// This will remove file extensions from the generated `import`.
// This is useful if your src/ files are for example .jsx or
// .es6 but your generated files are of a different extension.
// For situations like webpack you may want to disable this
var name;if(state.opts.nostrip!==true){name="./"+_path2["default"].join(src,_path2["default"].dirname(file),_path2["default"].basename(file))}else{name="./"+_path2["default"].join(src,file)}// Special behavior if 'filterNames'
if(filterNames.length>0){var _importDeclaration=t.importDeclaration(parts.map(function(part){return t.importDefaultSpecifier(t.identifier(part))}),t.stringLiteral(name));path.insertAfter(_importDeclaration);continue}// Generate temp. import declaration
var importDeclaration=t.importDeclaration([t.importDefaultSpecifier(id)],t.stringLiteral(name));// Initialize the top level directory as an empty object
var nested=parts.slice(0,-1);nested.forEach(function(nest){var setup=t.expressionStatement(t.assignmentExpression("=",t.memberExpression(t.identifier(wildcardName),t.stringLiteral(nest),true),t.objectExpression([])));path.insertBefore(setup)});// Chain the parts for access
var access=parts.reduce(function(prev,curr){if(!prev)return t.memberExpression(t.identifier(wildcardName),t.stringLiteral(curr),true);return t.memberExpression(prev,t.stringLiteral(curr),true)},null);// Assign the file to the parts
var thing=t.expressionStatement(t.assignmentExpression("=",access,id));path.insertAfter(thing);path.insertAfter(importDeclaration)}if(path.node.specifiers.length===0){path.remove()}}}}}}function getName(originalName,opts){// Strip extension
var fancyName=originalName.replace(/(?!^)\.[^.\s]+$/,"");// Handle dotfiles, remove prefix `.` in that case
if(fancyName[0]==="."){fancyName=fancyName.substring(1)}// If we're allowed to camel case, which is default, we run it
// through this regex which converts it to a PascalCase variable.
if(opts.noCamelCase!==true){fancyName=fancyName.match(/[A-Z][a-z]+(?![a-z])|[A-Z]+(?![a-z])|([a-zA-Z\d]+(?=-))|[a-zA-Z\d]+(?=_)|[a-z]+(?=[A-Z])|[A-Za-z0-9]+/g).map(function(s){return s[0].toUpperCase()+s.substring(1)}).join("")}return fancyName}