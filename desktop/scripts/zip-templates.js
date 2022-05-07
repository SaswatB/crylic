const fs = require("fs");
const path = require("path");
const yazl = require("yazl");

const zip = new yazl.ZipFile();

// recursive function for adding files to zip
const read = (subFolderPath, zipPath) =>
  fs.readdirSync(subFolderPath).forEach((file) => {
    const filePath = path.join(subFolderPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // recurse through the directory's children
      read(filePath, zipPath + file + "/");
    } else {
      zip.addFile(filePath, zipPath + file);
    }
  });
// read all files within the template folder
read(path.join(__dirname, "../templates/blank"), "");

// save zip
const outPath = path.join(
  __dirname,
  "../src/assets/project-blank-template.zip"
);
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
zip.outputStream.pipe(fs.createWriteStream(outPath)).on("close", function () {
  console.log("saved " + outPath);
});
zip.end();
