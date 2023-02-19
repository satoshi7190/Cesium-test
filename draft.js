// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjdmYzk5Ni1lZWM5LTQzMGItOTJlMi1jMmE4MTEyODUxM2EiLCJpZCI6OTI1MzgsImlhdCI6MTY1MTc5NTA2MX0.749U4AStD0Dc3dmI0taUBvaQc5Ohpf32FYfskjIl4pM';

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003);
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

const createDescriptionHtml = (items) => {
    let contentHtml = `<table class="cesium-infoBox-defaultTable"><tbody>`;
    for (let item in items) {
        contentHtml += '<tr><th>' + `${item}` + '</th>' + '<td>' + `${items[item]}` + '</td>' + '</tr>';
    }
    contentHtml += '</tbody></table>';
    return contentHtml;
};

// Viewerを表示、地形の読み込み、不要なボタン等はオフに
const viewer = new Cesium.Viewer('cesiumContainer', {
    contextOptions: {
        requestWebgl: true,
    },
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
    // shadows: false,
    // shouldAnimate: false,
    fullscreenButton: false,
    sceneModePicker: false,
    scene3DOnly: true,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    navigationInstructionsInitiallyVisible: false,
});
// viewer.scene.debugShowFramesPerSecond = true;
// viewer.scene.skyBox.show = false;
// viewer.scene.sun.show = false;
// viewer.scene.moon.show = false;
// viewer.scene.skyAtmosphere.show = false;
// viewer.scene.fog.enabled = false;
// viewer.scene.globe.showWaterEffect = false;
// viewer.scene.globe.depthTestAgainstTerrain = true;
// viewer.scene.globe.backFaceCulling = false;
// viewer.scene.globe.cartographicLimitRectangle = Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003);

// 微地形表現図を表示
viewer.scene.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
        url: '05LE904_4326.png',
        rectangle: Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003),
    }),
);

const getData = async (url) => {
    const response = await window.fetch(url);
    const featuresData = await response.json();
    return featuresData.objects.樹頂点データ.geometries;
};

// 経緯度から楕円体高を求める
const getPositionsHeight = async (positions) => {
    const terrainProvider = Cesium.createWorldTerrain();
    const promise = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return promise;
};

// czmlへの変換処理
const set3dData = async (url) => {
    // geojsonファイルの取得
    const geojsonData = await getData(url);

    // ポイントの各座標から楕円体高をまとめて取得
    const positions = [];
    geojsonData.forEach((feature) => {
        // 経度
        const longitude = feature.coordinates[0];
        // 緯度
        const latitude = feature.coordinates[1];
        // 経緯度から楕円体高を取得
        positions.push(Cesium.Cartographic.fromDegrees(longitude, latitude));
    });
    const positionsEllipsoidal = await getPositionsHeight(positions);

    // 立木の3Dオブジェクトの作成
    const arr = [];
    geojsonData.forEach((feature, i) => {
        // if (i > 200) {
        //     return;
        // }

        // 経度
        const longitude = feature.coordinates[0];
        // 緯度
        const latitude = feature.coordinates[1];
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

        switch (feature.properties.中樹種) {
            case 'スギ':
                trunkColor = [0, 100, 0, 250];
                break;
            case 'ヒノキ類':
                trunkColor = [0, 200, 40, 250];
                break;
            case 'マツ類':
                trunkColor = [20, 200, 160, 250];
                break;
            default:
                trunkColor = [0, 0, 0, 0];
        }

        // 幹
        const crownGeometry = new Cesium.CylinderGeometry({
            length: treeHeight,
            topRadius: dbh / 100,
            bottomRadius: dbh / 100,
            slices: 6,
        });

        const crownMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(longitude, latitude, trunkPositionZ)),
            new Cesium.Cartesian3(0, 0, 0),
            new Cesium.Matrix4(),
        );

        const crown3D = new Cesium.GeometryInstance({
            geometry: crownGeometry,
            modelMatrix: crownMatrix,
            id: '幹 ' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(255, 154, 39, 250)),
                show: new Cesium.ShowGeometryInstanceAttribute(true),
            },
        });
        // 樹冠
        const trunkGeometry = new Cesium.CylinderGeometry({
            length: treeCrownLength,
            topRadius: 0,
            bottomRadius: canopyProjectedArea / Math.PI,
            slices: 9,
        });

        const trunkMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(longitude, latitude, crownPositionZ)),
            new Cesium.Cartesian3(0, 0, 0),
            new Cesium.Matrix4(),
        );

        const trunk3D = new Cesium.GeometryInstance({
            geometry: trunkGeometry,
            modelMatrix: trunkMatrix,
            id: '樹冠 ' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(...trunkColor)),
                show: new Cesium.ShowGeometryInstanceAttribute(true),
            },
        });

        arr.push(trunk3D);
        arr.push(crown3D);
    });

    viewer.scene.primitives.add(
        new Cesium.Primitive({
            geometryInstances: arr,
            appearance: new Cesium.PerInstanceColorAppearance({
                translucent: false,
                closed: true,
            }),
        }),
    );
};

set3dData('樹頂点データ.topojson');

// const redCone = viewer.entities.add({
//     name: 'Red cone',
//     position: Cesium.Cartesian3.fromDegrees(-105.0, 40.0, 200000.0),
//     cylinder: {
//         length: 400000.0,
//         topRadius: 0.0,
//         bottomRadius: 200000.0,
//         material: Cesium.Color.RED,
//     },
// });

// const rectangleInstance = new Cesium.GeometryInstance({
//     geometry: new Cesium.RectangleGeometry({
//         rectangle: Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0),
//         vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
//     }),
//     id: 'rectangle',
//     attributes: {
//         color: new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5),
//     },
// });
// const ellipsoidInstance = new Cesium.GeometryInstance({
//     geometry: new Cesium.EllipsoidGeometry({
//         radii: new Cesium.Cartesian3(500000.0, 500000.0, 1000000.0),
//         vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
//     }),
//     modelMatrix: Cesium.Matrix4.multiplyByTranslation(
//         Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(-95.59777, 40.03883)),
//         new Cesium.Cartesian3(0.0, 0.0, 500000.0),
//         new Cesium.Matrix4(),
//     ),
//     id: 'ellipsoid',
//     attributes: {
//         color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.AQUA),
//     },
// });

// viewer.scene.primitives.add(
//     new Cesium.Primitive({
//         geometryInstances: [rectangleInstance, ellipsoidInstance, instances],
//         appearance: new Cesium.MaterialAppearance({
//             material: new Cesium.Material({
//                 // fabric: {
//                 //     type: 'Color',
//                 //     uniforms: {
//                 //         color: new Cesium.Color(1.0, 0, 0, 1.0),
//                 //     },
//                 // },
//             }),
//             faceForward: true,
//         }),
//         // allowPicking: false,
//         interleave: true,
//         releaseGeometryInstances: true,
//     }),
// );

// viewer.scene.primitives.add(
//     new Cesium.Primitive({
//         geometryInstances: instance,
//         appearance: new Cesium.PerInstanceColorAppearance(),
//     }),
// );

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((movement) => {
    const pick = viewer.scene.pick(movement.position);
    if (Cesium.defined(pick) && pick.id === 'my rectangle') {
        console.log('Mouse clicked rectangle.');
    }
    console.log(Cesium.defined(pick) && pick.id);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
