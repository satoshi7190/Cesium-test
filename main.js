// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjdmYzk5Ni1lZWM5LTQzMGItOTJlMi1jMmE4MTEyODUxM2EiLCJpZCI6OTI1MzgsImlhdCI6MTY1MTc5NTA2MX0.749U4AStD0Dc3dmI0taUBvaQc5Ohpf32FYfskjIl4pM';

// Viewerを表示、地形の読み込み、不要なボタン等はオフに
const viewer = new Cesium.Viewer('cesiumContainer', {
    // 地形の読み込み
    terrainProvider: Cesium.createWorldTerrain(),
    // 不要なボタン等はオフに
    timeline: false,
    animation: false,
    homeButton: false,
    vrButton: false,
    geocoder: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    shadows: false,
    shouldAnimate: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
});

viewer.scene.debugShowFramesPerSecond = true;

// Hides the stars
viewer.scene.skyBox.show = false;
// Explicitly render a new frame

// 初期表示位置
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(134.366, 35.451, 1200),
    orientation: {
        pitch: -0.5,
    },
    navigationHelpButton: false,
});

// 微地形表現図を表示
viewer.scene.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
        url: '05LE904_4326.png',
        rectangle: Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003),
    }),
);

// geojsonデータの取得
const getData = async (url) => {
    const response = await window.fetch(url);
    const featuresData = await response.json();
    return featuresData.features;
};

// 経緯度から楕円体高を求める
const getPositionsHeight = async (positions) => {
    const terrainProvider = Cesium.createWorldTerrain();
    const promise = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return promise;
};

// czmlへの変換処理
const set3dData = async (url, trunkColor, trunkoutlineColor) => {
    // geojsonファイルの取得
    const geojsonData = await getData(url);

    // ポイントの各座標から楕円体高をまとめて取得
    const positions = [];
    geojsonData.forEach((feature) => {
        // 経度
        const longitude = feature.geometry.coordinates[0];
        // 緯度
        const latitude = feature.geometry.coordinates[1];
        // 経緯度から楕円体高を取得
        positions.push(Cesium.Cartographic.fromDegrees(longitude, latitude));
    });
    const positionsEllipsoidal = await getPositionsHeight(positions);

    // 立木の3Dオブジェクトの作成
    const czmlData = [
        {
            id: 'document',
            name: 'CZML Geometries: Cylinder',
            version: '1.0',
        },
    ];
    geojsonData.forEach((feature, i) => {
        // 経度
        const longitude = feature.geometry.coordinates[0];
        // 緯度
        const latitude = feature.geometry.coordinates[1];
        // 樹高 (先端が出ないように少し低めに)
        const treeHeight = feature.properties.樹高 - feature.properties.樹冠長;
        // 樹冠長
        const treeCrownLength = feature.properties.樹冠長;
        // 枝下高
        const trunkHeight = feature.properties.樹高 - feature.properties.樹冠長;
        // 胸高直径
        const dbh = treeHeight / (feature.properties.形状比 / 100);
        // 樹冠投影面積
        const canopyProjectedArea = (feature.properties.樹冠体積 * Math.PI) / feature.properties.樹冠長;
        // 楕円体高
        const ellipsoidalHeight = positionsEllipsoidal[i].height;
        // 幹の高さの位置
        const trunkPositionZ = ellipsoidalHeight + treeHeight / 2;
        // 樹冠の高さの位置
        const crownPositionZ = ellipsoidalHeight + trunkHeight + treeCrownLength / 2;

        // 幹
        const crown3D = {
            id: feature.properties.中樹種 + '幹' + String(i),
            position: {
                cartographicDegrees: [longitude, latitude, trunkPositionZ],
            },
            cylinder: {
                length: treeHeight,
                topRadius: dbh / 100,
                bottomRadius: dbh / 100,
                slices: 6,
                outlineWidth: 6,
                material: {
                    solidColor: {
                        color: {
                            rgba: [255, 154, 39, 200],
                        },
                    },
                },
            },
        };

        // 樹冠
        const trunk3D = {
            id: feature.properties.中樹種 + '樹冠' + String(i),
            position: {
                cartographicDegrees: [longitude, latitude, crownPositionZ],
            },
            cylinder: {
                length: treeCrownLength,
                topRadius: 0,
                bottomRadius: canopyProjectedArea / Math.PI,
                slices: 6,
                numberOfVerticalLines: 6,
                outline: true,
                outlineColor: {
                    rgba: [255, 255, 255, 120],
                },

                material: {
                    solidColor: {
                        color: {
                            rgba: trunkColor,
                        },
                    },
                },
            },
        };
        czmlData.push(trunk3D);
        czmlData.push(crown3D);
    });

    // Cesiumに表示
    const dataSourcePromise = new Cesium.CzmlDataSource({ credit: '鳥取県オープンデータカタログサイト' }).load(czmlData);
    viewer.dataSources.add(dataSourcePromise);
    viewer.zoomTo(dataSourcePromise);
};

set3dData('ヒノキ_樹頂点_05LE904.geojson', [0, 100, 0, 200], [255, 255, 255, 100]);
set3dData('sugi_fix.geojson', [0, 200, 40, 200], [255, 255, 255, 100]);
set3dData('matsu_fix.geojson', [20, 200, 160, 200], [255, 255, 255, 100]);

// viewer.dataSources.add(Cesium.CzmlDataSource.load('sugi.json'), {});
// viewer.dataSources.add(Cesium.CzmlDataSource.load('mastu.json'), {});
// viewer.dataSources.add(Cesium.CzmlDataSource.load('hinoki.json'), {});
// viewer.dataSources.add(Cesium.CzmlDataSource.load('mix.json'), {});
