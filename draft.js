// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGUyMTQyNC1iOTg3LTQyMTctYTlmYi0zOWU1NWMwZDVkZDUiLCJpZCI6OTI1MzgsImlhdCI6MTY5MDA5MDA1M30.15TFa4yJ8zPbHKxPzr_H9KYcGhEFrp7VbkZ7Uz0aWZc';

// 地形データの読み込み;
const terrainProvider = Cesium.createWorldTerrain();

// ビューアーを作成
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: terrainProvider, // 地形を表示
    scene3DOnly: true, // 3D モードのパフォーマンスを最適化
});

// カメラの位置セット
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(134.358, 35.471, 900.0),
    orientation: {
        heading: Cesium.Math.toRadians(130.0),
        pitch: Cesium.Math.toRadians(-35.0),
    },
});

// 微地形表現図を表示
viewer.scene.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
        url: 'microtopographic.webp',
        rectangle: Cesium.Rectangle.fromDegrees(134.355368, 35.4591744, 134.3774097, 35.4727003),
    }),
);

// jsonファイルを取得する処理
const getData = async (url) => {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData;
};

// 経緯度から楕円体高を求める処理
const getPositionsHeight = async (positions) => {
    const promise = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return promise;
};

// 立木のオブシェクトを生成する処理
const createTree = async (url) => {
    // jsonファイルの取得
    const jsonData = await getData(url);

    // ポイントの各座標から楕円体高をまとめて取得
    const positions = [];
    jsonData.forEach((data) => {
        positions.push(Cesium.Cartographic.fromDegrees(data.X, data.Y));
    });
    const positionsEllipsoidal = await getPositionsHeight(positions);

    // ジオメトリインスタンスの配列
    const treeInstance = [];
    const outlineInstance = [];

    // オブジェクト生成処理
    jsonData.forEach((data, i) => {
        // if (i > 50) {
        //     return;
        // }
        // 経度
        const lng = data.X;
        // 緯度
        const lat = data.Y;
        // 枝下高
        const trunkHeight = data.H - data.Cl;
        // 幹半径
        const trunkRadius = data.D / 2;
        // 樹冠長
        const crownLength = data.Cl;
        // 樹冠半径
        const crownRadius = data.Bl;
        // 幹の高さの位置
        const trunkPositionZ = positionsEllipsoidal[i].height + trunkHeight / 2;
        // 樹冠の高さの位置
        const crownPositionZ = positionsEllipsoidal[i].height + trunkHeight + crownLength / 2;

        // 樹種による色分け：スギ（１）、ヒノキ（２）、マツ（３）
        switch (data.ID) {
            case 1:
                crownColor = [0, 100, 0];
                break;
            case 2:
                crownColor = [0, 200, 40];
                break;
            case 3:
                crownColor = [20, 200, 160];
                break;
            default:
                crownColor = [0, 0, 0, 0];
        }

        // 幹のマトリックス
        const trunkMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(lng, lat, trunkPositionZ)),
            new Cesium.Cartesian3(0, 0, 0),
            new Cesium.Matrix4(),
        );

        // 樹冠のマトリックス
        const crownMatrix = Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(lng, lat, crownPositionZ)),
            new Cesium.Cartesian3(0, 0, 0),
            new Cesium.Matrix4(),
        );

        // 幹のジオメトリインスタンス：円柱
        const trunkGeometryInstance = new Cesium.GeometryInstance({
            geometry: new Cesium.CylinderGeometry({
                length: trunkHeight,
                topRadius: trunkRadius,
                bottomRadius: trunkRadius,
                slices: 6,
                vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            modelMatrix: trunkMatrix,
            id: 'trunk' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(255, 154, 39, 255)),
            },
        });
        const hoge = new Cesium.CylinderGeometry({
            length: crownLength,
            topRadius: 0,
            bottomRadius: crownRadius,
            slices: 9,
            vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        });

        // 樹冠のジオメトリインスタンス：円錐
        const crownGeometryInstance = new Cesium.GeometryInstance({
            geometry: hoge,
            modelMatrix: crownMatrix,
            id: 'crown' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(...crownColor, 255)),
            },
        });

        // 幹のアウトラインのジオメトリインスタンス
        const trunkOutlineGeometryInstance = new Cesium.GeometryInstance({
            geometry: new Cesium.CylinderOutlineGeometry({
                length: trunkHeight,
                topRadius: trunkRadius,
                bottomRadius: trunkRadius,
                slices: 6,
                vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            modelMatrix: trunkMatrix,
            id: 'trunkOutline' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(255, 154, 39, 255)),
            },
        });

        // 樹冠のアウトラインのジオメトリインスタンス
        const crownOutlineGeometryInstance = new Cesium.GeometryInstance({
            geometry: new Cesium.CylinderOutlineGeometry({
                length: crownLength,
                topRadius: 0,
                bottomRadius: crownRadius,
                slices: 9,
                vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            modelMatrix: crownMatrix,
            id: 'crownOutline' + String(i),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(...crownColor, 255)),
            },
        });

        // 各インスタンスをそれぞれの配列に格納
        treeInstance.push(trunkGeometryInstance);
        treeInstance.push(crownGeometryInstance);
        outlineInstance.push(trunkOutlineGeometryInstance);
        outlineInstance.push(crownOutlineGeometryInstance);
    });

    // プリミティブの作成
    const treePrimitive = new Cesium.Primitive({
        geometryInstances: treeInstance,
        appearance: new Cesium.PerInstanceColorAppearance({
            translucent: false,
            closed: true,
        }),
        asynchronous: false,
    });
    const outlinePrimitive = new Cesium.Primitive({
        geometryInstances: outlineInstance,
        appearance: new Cesium.PerInstanceColorAppearance({
            translucent: false,
            closed: true,
        }),
        allowPicking: false,
        releaseGeometryInstances: false,
        asynchronous: false,
    });

    // プリミティブをシーンに追加
    viewer.scene.primitives.add(treePrimitive);
    viewer.scene.primitives.add(outlinePrimitive);
};

const jsondata = 'treetop.json'
// 処理の実行
createTree(jsondata);

// クリックイベント
viewer.screenSpaceEventHandler.setInputAction(function (click) {
    // 最も近いプリミティブを見つける
    const pickedPrimitive = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedPrimitive) && pickedPrimitive.primitive instanceof Cesium.Primitive) {
        // クリックしたジオメトリインスタンスのIDのナンバーを取得
        const primitive = pickedPrimitive.primitive;
        console.log(primitive);
        const attributes = primitive.getGeometryInstanceAttributes(pickedPrimitive.id);
        if (Cesium.defined(attributes)) {
            let targetID;
            if (pickedPrimitive.id.includes('trunk')) {
                targetID = pickedPrimitive.id.replace(/trunk/g, '');
            } else if (pickedPrimitive.id.includes('crown')) {
                targetID = pickedPrimitive.id.replace(/crown/g, '');
            }

            // 各ジオメトリインスタンスを取得
            const trunk = viewer.scene.primitives._primitives[0].getGeometryInstanceAttributes('trunk' + targetID);
            const crown = viewer.scene.primitives._primitives[0].getGeometryInstanceAttributes('crown' + targetID);
            const trunkOutline = viewer.scene.primitives._primitives[1].getGeometryInstanceAttributes('trunkOutline' + targetID);
            const crownOutline = viewer.scene.primitives._primitives[1].getGeometryInstanceAttributes('crownOutline' + targetID);

            // 各ジオメトリインスタンスを非表示にする
            trunk.show = Cesium.ShowGeometryInstanceAttribute.toValue(false);
            crown.show = Cesium.ShowGeometryInstanceAttribute.toValue(false);
            trunkOutline.show = Cesium.ShowGeometryInstanceAttribute.toValue(false);
            crownOutline.show = Cesium.ShowGeometryInstanceAttribute.toValue(false);
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
