// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjdmYzk5Ni1lZWM5LTQzMGItOTJlMi1jMmE4MTEyODUxM2EiLCJpZCI6OTI1MzgsImlhdCI6MTY1MTc5NTA2MX0.749U4AStD0Dc3dmI0taUBvaQc5Ohpf32FYfskjIl4pM';

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003);
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

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
    shadows: false,
    shouldAnimate: false,
    fullscreenButton: false,
    sceneModePicker: false,
    scene3DOnly: true,
    requestRenderMode: true,
    // maximumRenderTimeChange: Infinity,
    navigationInstructionsInitiallyVisible: false,
});
viewer.scene.debugShowFramesPerSecond = true;
// viewer.scene.skyBox.show = false;
viewer.scene.sun.show = false;
viewer.scene.moon.show = false;
// viewer.scene.skyAtmosphere.show = false;
// viewer.scene.fog.enabled = false;
viewer.scene.globe.showWaterEffect = false;
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.globe.backFaceCulling = false;
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

// 変換処理
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
    const treeInstance = [];
    const outlineInstance = [];
    geojsonData.forEach((feature, i) => {
        // if (i > 500) {
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
            slices: 8,
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

        treeInstance.push(crown3D);
        treeInstance.push(trunk3D);

        if (feature.properties.樹冠体積 <= 0.1) {
            return;
        }

        const outlineGeometryorizin = new Cesium.GeometryPipeline.toWireframe(Cesium.CylinderGeometry.createGeometry(trunkGeometry));
        const outlineGeometry = new Cesium.GeometryPipeline.compressVertices(outlineGeometryorizin);

        const outline3D = new Cesium.GeometryInstance({
            geometry: outlineGeometry,
            modelMatrix: trunkMatrix,
            id: 'line' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(255, 255, 255, 80)),
                show: new Cesium.ShowGeometryInstanceAttribute(true),
            },
        });

        outlineInstance.push(outline3D);
    });

    viewer.scene.primitives.add(
        new Cesium.Primitive({
            geometryInstances: treeInstance,
            appearance: new Cesium.PerInstanceColorAppearance({
                // translucent: false,
                // closed: true,
            }),
            // flat: true,
            vertexCacheOptimize: true,
            compressVertices: true,
            debugShowBoundingVolume: true,
            interleave: true,
        }),
    );

    viewer.scene.primitives.add(
        new Cesium.Primitive({
            geometryInstances: outlineInstance,
            appearance: new Cesium.PerInstanceColorAppearance({
                // translucent: false,
                // closed: true,
            }),
            // flat: true,
            vertexCacheOptimize: true,
            compressVertices: true,
            interleave: true,
            allowPicking: false,
            appearance: new Cesium.PerInstanceColorAppearance({}),
        }),
    );
};

set3dData('樹頂点データ.topojson');

// const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
// handler.setInputAction((movement) => {
//     const pick = viewer.scene.pick(movement.position);
//     if (Cesium.defined(pick) && pick.id === 'my rectangle') {
//         console.log('Mouse clicked rectangle.');
//     }
//     console.log(Cesium.defined(pick) && pick.id);
// }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
