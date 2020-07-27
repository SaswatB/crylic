var fs = require("fs");
const path = require("path");
var archiver = require("archiver");

const getProjectPath = (name) => path.join(__dirname, "..", name);

// create a file to stream archive data to.
const archivePath = getProjectPath("build.zip");
var output = fs.createWriteStream(archivePath);
var archive = archiver("zip", {
  zlib: { level: 9 }, // Sets the compression level.
});

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on("close", function () {
  console.log(archive.pointer() + " total bytes");
  console.log(
    "archiver has been finalized and the output file descriptor has closed."
  );
});

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on("end", function () {
  console.log("Data has been drained");
});

// pipe archive data to the file
archive.pipe(output);

// append files
[
  "package.json",
  "package-lock.json",
  "app/package.json",
  "app/package-lock.json",
].forEach((name) => {
  archive.file(getProjectPath(name), { name });
});

// append files from a sub-directory
archive.directory(getProjectPath("app/build/"), "app/build");
archive.directory(getProjectPath("app/build-main/"), "app/build-main");
archive.directory(getProjectPath("app/patches/"), "app/patches");

// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
archive.finalize();
