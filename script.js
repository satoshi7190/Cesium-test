import * as Cesium from 'https://cesium.com/downloads/cesiumjs/releases/1.99/Build/Cesium/Cesium.js';

// アクセストークン
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjdmYzk5Ni1lZWM5LTQzMGItOTJlMi1jMmE4MTEyODUxM2EiLCJpZCI6OTI1MzgsImlhdCI6MTY1MTc5NTA2MX0.749U4AStD0Dc3dmI0taUBvaQc5Ohpf32FYfskjIl4pM';

// geojsonデータの取得
async function getData(url, rgba) {
    const response = await window.fetch(url);
    const featuresData = await response.json();
    set3dData(featuresData.features, rgba);
}

// 経緯度から楕円体高を求める
async function getArrZ(arr) {
    const terrainProvider = Cesium.createWorldTerrain();
    const positions = arr;
    const promise = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return promise;
}

// getData('/tottori/hinoki_fix.geojson', [0, 250, 0, 100]);
// getData('/tottori/sugi_fix.geojson', [0, 100, 0, 100]);
getData('/tottori/matsu_fix.geojson', [0, 200, 90, 100]);

async function set3dData(data, rgba) {
    const latlonArray = [];
    data.forEach((feature) => {
        // 位置情報
        const longitude = feature.geometry.coordinates[0];
        const latitude = feature.geometry.coordinates[1];
        latlonArray.push(Cesium.Cartographic.fromDegrees(longitude, latitude));
    });

    const heightArray = await getArrZ(latlonArray);

    const czmlData = [
        {
            id: 'document',
            name: 'CZML Geometries: Polyline',
            version: '1.0',
        },
    ];
    data.forEach((feature, i) => {
        // 経度
        const longitude = feature.geometry.coordinates[0];
        // 緯度
        const latitude = feature.geometry.coordinates[1];
        // 樹高
        const treeHeight = feature.properties.樹高;
        // 樹冠長
        const crownHeight = feature.properties.樹冠長;
        // 枝下高
        const trunkHeight = feature.properties.樹高 - feature.properties.樹冠長;
        // 幹直径
        const hutosa = treeHeight / (feature.properties.形状比 / 100);
        // 樹幹半径
        const zyukanhankei = feature.properties.樹冠面積 / Math.PI;
        // 楕円体高
        const ellipsoidalHeight = heightArray[i].height;
        // 幹の高さの位置
        const trunkPositionZ = ellipsoidalHeight + treeHeight / 2;
        // 樹冠の高さの位置
        const crownPositionZ = ellipsoidalHeight + trunkHeight + crownHeight / 2;

        // 幹の3Dオブジェクトを作成
        const crown3D = {
            id: feature.properties.中樹種 + '幹' + String(i),
            position: {
                cartographicDegrees: [longitude, latitude, trunkPositionZ],
            },
            cylinder: {
                length: treeHeight,
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
        // 樹冠の3Dオブジェクトを作成
        const trunk3D = {
            id: feature.properties.中樹種 + '樹幹' + String(i),
            name: feature.properties.中樹種 + '樹幹' + String(i),
            position: {
                cartographicDegrees: [longitude, latitude, crownPositionZ],
            },
            cylinder: {
                length: crownHeight,
                topRadius: 0,
                bottomRadius: zyukanhankei,
                outlineColor: {
                    rgba: [255, 255, 255, 10],
                },
                outlineWidth: 1,
                slices: 6,
                numberOfVerticalLines: 2,
                material: {
                    solidColor: {
                        color: {
                            rgba: rgba,
                        },
                    },
                },
            },
        };

        czmlData.push(trunk3D);
        czmlData.push(crown3D);
    });
    console.log(czmlData);
}


// blackMarble.alpha = 0.5;
// blackMarble.brightness = 1.0;

// viewer.dataSources.add(Cesium.CzmlDataSource.load('sugi.json'), {});
// viewer.dataSources.add(Cesium.CzmlDataSource.load('mastu.json'), {});
// viewer.dataSources.add(Cesium.CzmlDataSource.load('hinoki.json'), {});
