// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZmUyZGRjNy01ODhiLTRlOGMtYmIxMC03YWYwNzIwZjRlOTYiLCJpZCI6OTI1MzgsImlhdCI6MTY3NzA3NTY1N30.otNcG_H9SIbgG-TqH5PXCfqRqiY-g30AeBDInIbzdJI';

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003);
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

// Viewerを表示、地形の読み込み、不要なボタン等はオフに
const viewer = new Cesium.Viewer('cesiumContainer', {
    contextOptions: {
        requestWebgl: true,
    },
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
        url: 'microtopographic.webp',
        rectangle: Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003),
    }),
);

const getData = async (url) => {
    const response = await window.fetch(url);
    const featuresData = await response.json();
    return featuresData;
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
    const jsonData = await getData(url);

    // ポイントの各座標から楕円体高をまとめて取得
    const positions = [];
    jsonData.forEach((f) => {
        // 経緯度から楕円体高を取得
        positions.push(Cesium.Cartographic.fromDegrees(f.X, f.Y));
    });
    const positionsEllipsoidal = await getPositionsHeight(positions);

    // 立木の3Dオブジェクトの作成
    const treeInstance = [];
    const outlineInstance = [];
    jsonData.forEach((f, i) => {
        // if (i > 50) {
        //     return;
        // }

        // 樹高 (先端が出ないように少し低めに)
        const treeHeight = f.H - f.Cl;
        // 樹冠長
        const treeCrownLength = f.Cl;
        // 枝下高
        const trunkHeight = f.H - f.Cl;

        // 楕円体高
        const ellipsoidalHeight = positionsEllipsoidal[i].height;
        // 幹の高さの位置
        const trunkPositionZ = ellipsoidalHeight + treeHeight / 2;
        // 樹冠の高さの位置
        const crownPositionZ = ellipsoidalHeight + trunkHeight + treeCrownLength / 2;

        switch (f.ID) {
            case 1:
                trunkColor = [0, 100, 0, 250];
                break;
            case 2:
                trunkColor = [0, 200, 40, 250];
                break;
            case 3:
                trunkColor = [20, 200, 160, 250];
                break;
            default:
                trunkColor = [0, 0, 0, 0];
        }

        // 幹
        const crownGeometry = new Cesium.CylinderGeometry({
            length: f.H - f.Cl,
            topRadius: f.D / 2,
            bottomRadius: f.D / 2,
            slices: 6,
        });

        const crownMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(f.X, f.Y, trunkPositionZ)),
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
            length: f.Cl,
            topRadius: 0,
            bottomRadius: f.Bl,
            slices: 9,
        });

        const trunkMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(f.X, f.Y, crownPositionZ)),
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

        const outlineGeometry = new Cesium.CylinderOutlineGeometry({
            length: f.Cl,
            topRadius: 0,
            bottomRadius: f.Bl,
            slices: 9,
        });

        const outlineMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(f.X, f.Y, crownPositionZ)),
            new Cesium.Cartesian3(0, 0, 0),
            new Cesium.Matrix4(),
        );

        const outline3D = new Cesium.GeometryInstance({
            geometry: outlineGeometry,
            modelMatrix: outlineMatrix,
            id: 'outline ' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(255, 255, 255, 255)),
                show: new Cesium.ShowGeometryInstanceAttribute(true),
            },
        });

        treeInstance.push(crown3D);
        treeInstance.push(trunk3D);
        outlineInstance.push(outline3D);
    });

    viewer.scene.primitives.add(
        new Cesium.Primitive({
            geometryInstances: treeInstance,
            appearance: new Cesium.PerInstanceColorAppearance({
                // flat: true,
                // translucent: false,
                faceForward: false,
                // closed: true,
            }),
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
                faceForward: false,
            }),
            // flat: false,
            vertexCacheOptimize: true,
            compressVertices: true,
            interleave: true,
            allowPicking: false,
            appearance: new Cesium.PerInstanceColorAppearance({}),
        }),
    );
};

set3dData('treeTop.json');
