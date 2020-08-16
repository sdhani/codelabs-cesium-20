import assets from "./assets.js"; /* Ion asset IDs for LiDAR frames. */

/* Special READ-ONLY token for accessing the converted LiDAR files for your visualization */
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmODNkMWI0MS1kZGNkLTQ0OWMtOTM3NC1mNjhmMThmYzJmOTciLCJpZCI6MzA5NzAsInNjb3BlcyI6WyJhc3IiXSwiaWF0IjoxNTk2NDkxMTc3fQ.GRJZntGzLeLf8ZEZ7d441ZsJ09gx5WdjYWBmmHePwiw";

/* Create a Cesium Viewer */
var viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.enableLighting = true;

var scene = viewer.scene;
var viewModelTileset;

function reset() {
  viewer.scene.primitives.remove(viewModelTileset);
  viewModelTileset = undefined;
}

function checkZero(newValue) {
  var newValueFloat = parseFloat(newValue);
  return newValueFloat === 0.0 ? undefined : newValueFloat;
}

// The viewModel tracks the state of our mini application.
var pointClouds = assets;
var viewModel = {
  exampleTypes: pointClouds,
  currentExampleType: pointClouds[0],
  maximumScreenSpaceError: 16.0,
  geometricErrorScale: 1.0,
  maximumAttenuation: 0, // Equivalent to undefined
  baseResolution: 0, // Equivalent to undefined
  eyeDomeLightingStrength: 1.0,
  eyeDomeLightingRadius: 1.0
};

const pointCloudArray = [];
const pointCloudPositions = [];

/* Add each LiDAR frame to the cesium viewer scene. */
for (let frame = 0; frame < assets.length; ++frame) {
  const pointCloudFrame = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
      url: Cesium.IonResource.fromAssetId(assets[frame]),
      pointCloudShading: {
        attenuation: true,
        maximumAttenuation: 8,
        eyeDomeLighting: true,
        geometricErrorScale: 1.0,
        baseResolution: 10,
        eyeDomeLightingStrength: 1.9,
        eyeDomeLightingRadius: 1
      }
    })
  );

  /* Translate frames to show data movement */
  let lon = -122.137932;
  let lat = 37.4487;
  lon += 0.00005 * frame;
  const position = [lon, lat];
  pointCloudPositions.push(position);

  moveTileset(pointCloudFrame, Cesium.Cartesian3.fromDegrees(lon, lat, 6));
  pointCloudFrame.show = false; // Hide all of the frames
  pointCloudArray.push(pointCloudFrame);
}

window.pointCloudArray = pointCloudArray;

let startTime = Cesium.JulianDate.fromDate(new Date(2018, 11, 12, 15));
let totalSeconds = assets.length;
console.log(assets.length);
let stopTime = Cesium.JulianDate.addSeconds(
  startTime,
  totalSeconds,
  new Cesium.JulianDate()
);

let currentFrame;
let length = pointCloudArray.length;

let clock = viewer.clock;
clock.canAnimate = true;
clock.shouldAnimate = true;
clock.multiplier = 1;
clock.startTime = startTime;
clock.currentTime = startTime;
clock.stopTime = stopTime;
clock.clockRange = Cesium.ClockRange.LOOP_STOP;
viewer.timeline.zoomTo(startTime, stopTime);

/* Make current frame visible based on time */
clock.onTick.addEventListener(function(clock) {
  let currentTime = viewer.clock.currentTime;
  let secondsDiff = Cesium.JulianDate.secondsDifference(currentTime, startTime);
  let frame = Math.round(secondsDiff) % length;

  if (currentFrame !== frame) {
    // Hide all point cloud frames
    for (let pointCloud of pointCloudArray) pointCloud.show = false;
    // Show the new current frame
    currentFrame = frame;
    tilesetToViewModel(pointCloudArray[currentFrame]);
    pointCloudArray[currentFrame].show = true;
  }
});

/* Zoom into the first LiDAR frame's location */
viewer.zoomTo(pointCloudArray[0]);

/* Add Cesium Car Model to Viewer Correctly Positioned */
let carUrl =
  "https://cdn.glitch.com/4fe9306e-009e-4e4c-87b8-1e5d7db371c0%2FcarRotated3.glb?v=1596160255611";

let position = new Cesium.SampledPositionProperty();

/* Move Car Dynamically to position of currentFrame */
for (let i = 0; i < pointCloudPositions.length; ++i) {
  let time = Cesium.JulianDate.addSeconds(
    startTime,
    i + 4,
    new Cesium.JulianDate()
  );

  let newLong = pointCloudPositions[i][0];
  let newLat = pointCloudPositions[i][1];
  position.addSample(
    time,
    new Cesium.Cartesian3.fromDegrees(newLong, newLat + 0.00009, 0)
  );
}

let entity = viewer.entities.add({
  position: position,
  orientation: new Cesium.VelocityOrientationProperty(position),
  model: {
    uri: carUrl
  }
});
viewer.trackedEntity = entity;

function moveTileset(tileset, location) {
  tileset.readyPromise
    .then(function() {
      var tilesetLocation = new Cesium.Cartesian3(6378150.5, 18.5, -15); //tileset.root.boundingSphere.center;
      // Get the matrix that moves a point from the center of the earth to this location
      var originToSurfaceMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
        tilesetLocation.clone()
      );
      // Invert this matrix, to bring the tileset back to the center of the earth
      var surfaceToOriginMatrix = Cesium.Matrix4.inverse(
        originToSurfaceMatrix,
        new Cesium.Matrix4()
      );

      // This is where you would apply the scale
      // scale down the surfaceToOriginMatrix

      // Now construct a matrix to move it to Palo Alto (or wherever)
      var originToPaloAltoSurfaceMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
        location
      );
      // Compose these two matrices
      var finalTransform = Cesium.Matrix4.multiply(
        originToPaloAltoSurfaceMatrix,
        surfaceToOriginMatrix,
        new Cesium.Matrix4()
      );
      // Apply the matrix to the tileset
      tileset.modelMatrix = finalTransform;
    })
    .otherwise(function(error) {
      console.log(error);
    });

  var X = location.x - 12;
  var Y = location.y + 22;
  var Z = location.z + 13;

  var style = {
    defines: {
      distance:
        "clamp(distance(${POSITION_ABSOLUTE}, vec3(" +
        X +
        "," +
        Y +
        "," +
        Z +
        ")) / 50.0, 0.0, 1.0)"
    },
    color: 'mix(color("yellow"), color("red"), ${distance})'
  };
  tileset.style = new Cesium.Cesium3DTileStyle(style);
}
