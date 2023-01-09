Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjdmYzk5Ni1lZWM5LTQzMGItOTJlMi1jMmE4MTEyODUxM2EiLCJpZCI6OTI1MzgsImlhdCI6MTY1MTc5NTA2MX0.749U4AStD0Dc3dmI0taUBvaQc5Ohpf32FYfskjIl4pM';

async function getData(url, rgba, type) {
    const response = await window.fetch(url);
    const featuresData = await response.json();
    if (type === '3d') {
        set3dData(featuresData.features, rgba);
    }

    if (type === 'polyline') {
        setPolylineData(featuresData.features[0].geometry.coordinates, rgba);
    }
}

// Cesium ViewerをcesiumContainerというIDのHTML要素に初期化
const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png',
        credit: '© Analytical Graphics, Inc.',
    }),

    terrainProvider: Cesium.createWorldTerrain({
        requestVertexNormals: true,
        // requestWaterMask: true,
    }),
    baseLayerPicker: false,
    animation: false,
    fullscreenButton: false,
    homeButton: false,
    geocoder: false,
    infoBox: true,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    sceneModePicker: false,
    // shadows: true,
    // terrainShadows: Cesium.ShadowMode.ENABLED,
    // mapProjection: new Cesium.WebMercatorProjection(Cesium.Ellipsoid.WGS84),
});

// 初期表示時のカメラ位置
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(134.363874, 35.462414, 6000), // 初期位置:
    orientation: {
        heading: 0, // 水平方向の回転度（ラジアン）
        pitch: -0.5, // 垂直方向の回転度（ラジアン）
        roll: 0,
    },
});

getData('/tottori/toukousen_pl.geojson', [0, 20, 90, 100], 'polyline');
getData('/tottori/romou_pl.geojson', [0, 200, 90, 100], 'polyline');
getData('/tottori/hinoki_fix.geojson', [0, 250, 0, 100], '3d');
getData('/tottori/sugi_fix.geojson', [0, 100, 0, 100], '3d');
getData('/tottori/matsu_fix.geojson', [0, 200, 90, 100], '3d');

var blackMarble = viewer.scene.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
        url: '/tottori/bitikei.png',
        rectangle: Cesium.Rectangle.fromDegrees(134.3553679687581734, 35.4591743626733731, 134.3774096939206402, 35.4727003192825734),
    }),
);
blackMarble.alpha = 0.5; // 0.0 is transparent.  1.0 is opaque.
blackMarble.brightness = 1.0; // > 1.0 increases brightness.  < 1.0 decreases.

function set3dData(data, rgba) {
    const czmlData = [
        {
            id: 'document',
            name: 'CZML Geometries: Polyline',
            version: '1.0',
        },
    ];
    data.forEach((feature, i) => {
        // if (i > 500) {
        //     return;
        // }
        // 位置情報
        const coordinates = feature.geometry.coordinates;
        // 樹高
        const takasa = feature.properties.樹高;
        // 枝下高
        const edasitakou = feature.properties.樹高 - feature.properties.樹冠長;
        // 樹幹半径
        const zyukanhankei = feature.properties.樹冠面積 / Math.PI;
        // 幹直径
        const hutosa = feature.properties.樹高 / (feature.properties.形状比 / 100);
        // 標高
        const hyoukou = feature.properties.標高 + 40;

        const zyukan3D = {
            id: feature.properties.中樹種 + '幹' + String(i),
            position: {
                // cartographicDegrees: [coordinates[0], coordinates[1], 0],
                cartographicDegrees: [coordinates[0], coordinates[1], takasa / 2 + hyoukou],
            },
            cylinder: {
                length: takasa,
                topRadius: 0,
                bottomRadius: hutosa / 100,
                slices: 6,
                material: {
                    solidColor: {
                        color: {
                            rgba: [255, 154, 39, 255],
                        },
                    },
                },
            },
        };
        const miki3D = {
            id: feature.properties.中樹種 + '樹幹' + String(i),
            name: feature.properties.中樹種 + '樹幹' + String(i),
            position: {
                cartographicDegrees: [coordinates[0], coordinates[1], feature.properties.樹冠長 / 2 + hyoukou + edasitakou],
            },
            cylinder: {
                length: feature.properties.樹冠長,
                topRadius: 0.0,
                bottomRadius: zyukanhankei,
                outline: true,
                outlineColor: {
                    rgba: [255, 255, 255, 120],
                },
                outlineWidth: 1,
                slices: 6,
                numberOfVerticalLines: 6,
                material: {
                    solidColor: {
                        color: {
                            rgba: rgba,
                        },
                    },
                },
            },
        };

        czmlData.push(zyukan3D);
        czmlData.push(miki3D);
    });
    const dataSourcePromise = Cesium.CzmlDataSource.load(czmlData);
    viewer.dataSources.add(dataSourcePromise, {
    });
    viewer.zoomTo(dataSourcePromise);
}

function setPolylineData(data, rgba) {
    const czmlData2 = [
        {
            id: 'document',
            name: 'CZML Geometries: Cones and Cylinders',
            version: '1.0',
        },
    ];
    data.forEach((feature, i) => {
        const coordinates = feature;
        const cartographicDegrees = [];
        coordinates.forEach((point) => {
            cartographicDegrees.push(point[0]);
            cartographicDegrees.push(point[1]);
            cartographicDegrees.push(0);
        });
        const czml2 = {
            id: 'redLine' + String(i),
            name: 'redLine' + String(i),
            polyline: {
                positions: {
                    cartographicDegrees: cartographicDegrees,
                },
                material: {
                    polylineGlow: {
                        color: {
                            rgba: rgba,
                        },
                        glowPower: 0.1,
                    },
                },
                width: 10,
                clampToGround: true,
            },
        };
        czmlData2.push(czml2);
    });
    const dataSourcePromise2 = Cesium.CzmlDataSource.load(czmlData2);
    viewer.dataSources.add(dataSourcePromise2, {
    });
    viewer.zoomTo(dataSourcePromise2);
}
