Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZmUyZGRjNy01ODhiLTRlOGMtYmIxMC03YWYwNzIwZjRlOTYiLCJpZCI6OTI1MzgsImlhdCI6MTY3NzA3NTY1N30.otNcG_H9SIbgG-TqH5PXCfqRqiY-g30AeBDInIbzdJI';

// 地形データの読み込み;
const terrainProvider = Cesium.createWorldTerrain();

// ビューアーを作成
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: terrainProvider, // 地形を表示
    scene3DOnly: true, //3Dモードのパフォーマンスを最適化
});

// 経緯度から楕円体高を求める処理;
const getPositionsHeight = async (positions) => {
    const promise = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return promise;
};

// 立木のオブシェクトを生成する処理
const createTree = async () => {
    // 経度
    const lng = 134.355962;
    // 緯度
    const lat = 35.46594644;
    // 楕円体高を取得
    const positions = [Cesium.Cartographic.fromDegrees(lng, lat)];
    const positionsEllipsoidal = await getPositionsHeight(positions);

    // 枝下高
    const trunkHeight = 13.7 - 7.9;
    // 幹半径
    const trunkRadius = 0.15;
    // 樹冠長
    const crownLength = 7.9;
    // 樹冠半径
    const crownRadius = 2;
    // 幹の高さの位置
    const trunkPositionZ = positionsEllipsoidal[0].height + trunkHeight / 2;
    // 樹冠の高さの位置
    const crownPositionZ = positionsEllipsoidal[0].height + trunkHeight + crownLength / 2;

    // 幹
    const trunk = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, trunkPositionZ),
        cylinder: {
            length: trunkHeight,
            topRadius: trunkRadius,
            bottomRadius: trunkRadius,
            material: Cesium.Color.fromBytes(255, 154, 39, 255),
        },
    });

    // 樹冠
    const crown = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, crownPositionZ),
        cylinder: {
            length: crownLength,
            topRadius: 0,
            bottomRadius: crownRadius,
            material: Cesium.Color.fromBytes(0, 100, 0, 255),
        },
    });

    // 立木オブシェクトにズーム
    viewer.zoomTo(viewer.entities);
};

// 処理の実行
createTree();
