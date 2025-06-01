<template>
  <!-- 地图容器 -->
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
// Vue相关导入
import { ref, onMounted } from 'vue'
// OpenLayers核心模块导入
import { Map, View } from 'ol'  // 地图和视图
import { fromLonLat } from 'ol/proj'  // 坐标转换
import TileLayer from 'ol/layer/Tile'  // 瓦片图层
import XYZ from 'ol/source/XYZ'  // XYZ瓦片源
import VectorLayer from 'ol/layer/Vector'  // 矢量图层
import VectorSource from 'ol/source/Vector'  // 矢量数据源
import { GeoJSON } from 'ol/format'  // GeoJSON格式解析
import Feature from 'ol/Feature'  // 地理要素
import LineString from 'ol/geom/LineString';  // 线几何图形
import Point from 'ol/geom/Point';  // 点几何图形
import { defaults, ScaleLine  } from 'ol/control';  // 添加这行导入
import { Style, Stroke, Circle, Fill, Text } from 'ol/style';
// 在OpenLayers核心模块导入部分添加
import Overlay from 'ol/Overlay';

// ... 其他导入保持不变 ...
// 地图容器引用
const mapContainer = ref(null)

/**
 * 初始地理要素数据
 * 包含一条从北京到上海的物流路线
 */
// 修改初始地理要素数据 - 长沙到北京路线
const initialFeatures = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [112.938, 28.229],  // 长沙坐标(经度,纬度)
          [116.397, 39.908]   // 北京坐标(经度,纬度)
        ]
      },
      properties: {
        routeId: 'CS-BJ-001',  // 修改路线ID
        status: 'in-transit'
      }
    }
  ]
}

// 组件挂载后初始化地图
onMounted(() => {
  if (mapContainer.value) {
    // 创建地图实例
    const map = new Map({
      target: mapContainer.value,  // 挂载目标
      layers: [
        // 底图图层 - 使用高德地图服务
        new TileLayer({
          source: new XYZ({
            url: 'https://webst0{1-4}.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
            attributions: '© <a href="https://www.amap.com/">高德地图</a>',
            tileSize: 256,
            crossOrigin: 'anonymous'
          })
        })
      ],
      // 地图视图配置
      view: new View({
        projection: 'EPSG:3857',  // Web墨卡托投影
        center: fromLonLat([116.397, 39.908]),  // 初始中心点(北京)
        zoom: 5  // 初始缩放级别
      }),
      // 添加这行配置来自定义控件
      // 修改controls配置部分
      controls: defaults({
        zoom: true,
        zoomOptions: {
          className: 'custom-zoom',
          zoomInLabel: '+',
          zoomOutLabel: '-',
          delta: 1
        }
      }).extend([
        new ScaleLine({
          units: 'metric',
          bar: true,
          steps: 4,  // 明确指定刻度数量
          text: true,
          minWidth: 100
        })
      ])
      // 清空其他默认控件
    });

    /**
     * 创建矢量图层 - 用于显示物流路线
     */
    const vectorSource = new VectorSource({
      // 从GeoJSON数据创建要素
      features: new GeoJSON().readFeatures(initialFeatures)
    });

    // 配置矢量图层样式
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: {
        'stroke-color': '#3388ff',  // 线条颜色
        'stroke-width': 3  // 线条宽度
      }
    });

    // 将矢量图层添加到地图
    map.addLayer(vectorLayer);

    
    // 创建导航路线样式
    const routeStyle = new Style({
      stroke: new Stroke({
        color: '#3388ff',
        width: 4
      })
    });

    // 创建标记点样式时添加文字样式
    // 修改标记点样式为打卡标记样式
    const markerStyle = new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: '#ff5722' }),  // 橙色填充
        stroke: new Stroke({ 
          color: '#ffffff', 
          width: 3 
        })
      }),
      text: new Text({
        text: '',
        font: 'bold 12px Microsoft YaHei',
        fill: new Fill({ color: '#ffffff' }),  // 白色文字
        offsetY: 0,
        textAlign: 'center'
      })
    });
    
    // 创建起点标记
    const startMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[0])),
      name: '起点',
      type: 'start'  // 添加类型标识
    });
    const startStyle = markerStyle.clone();
    startStyle.getText().setText('起');
    startMarker.setStyle(startStyle);
    
    // 创建终点标记 
    const endMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[1])),
      name: '终点',
      type: 'end'  // 添加类型标识
    });
    const endStyle = markerStyle.clone();
    endStyle.getText().setText('终');
    endMarker.setStyle(endStyle);
    
    // 添加点击事件处理
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature && (feature.get('type') === 'start' || feature.get('type') === 'end')) {
        const name = feature.get('name');
        const coordinates = feature.getGeometry().getCoordinates();
        const overlay = new Overlay({
          element: createPopupElement(name),
          position: coordinates,
          offset: [0, 0]
        });
        map.addOverlay(overlay);
        
        // 点击其他地方时移除标注
        map.once('click', () => {
          map.removeOverlay(overlay);
        });
      }
    });
    
    // 创建标注元素
    // 修改createPopupElement函数
    function createPopupElement(name) {
      const element = document.createElement('div');
      element.className = 'marker-popup';
      element.innerHTML = `
        <div class="popup-content">
          <div class="popup-title">${name}</div>
          <div class="popup-arrow"></div>
        </div>
      `;
      return element;
    }
    
    // 创建车辆样式
    const vehicleStyle = new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({ color: '#00ff00' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    });

    // 创建路线要素时转换坐标
    const routeFeature = new Feature({
      geometry: new LineString(
        initialFeatures.features[0].geometry.coordinates.map(coord => fromLonLat(coord))
      ),
      name: '导航路线'
    });
    // 应用路线样式
    routeFeature.setStyle(routeStyle);
    
    
    // 创建车辆标记时转换坐标
    const vehicleMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[0])),
      name: '车辆'
    });
    vehicleMarker.setStyle(vehicleStyle);

    // 将要素添加到数据源
    vectorSource.addFeatures([routeFeature, startMarker, endMarker, vehicleMarker]);

    // 调整视图以显示整个路线
    map.getView().fit(routeFeature.getGeometry(), {
      padding: [50, 50, 50, 50],
      maxZoom: 10
    });

    // 车辆移动动画 - 可调整速度和步数
    let step = 0;
    const timer = setInterval(() => {
      const coordinates = initialFeatures.features[0].geometry.coordinates;
      const progress = step / 100;
      const newCoord = [
        coordinates[0][0] + (coordinates[1][0] - coordinates[0][0]) * progress,
        coordinates[0][1] + (coordinates[1][1] - coordinates[0][1]) * progress
      ];
      
      // 更新车辆位置
      vehicleMarker.getGeometry().setCoordinates(newCoord);
      
      if(++step > 100) clearInterval(timer);  // 可调整总步数
    }, 50);  // 可调整时间间隔(毫秒)
  }
});
</script>

<style>
@import 'ol/ol.css';
</style>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  background-color: #f0f0f0;
  position: relative;
}
/* 使用::v-deep实现深度注入 */
::v-deep .marker-popup {
  position: relative;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #eee;
  top: -49px;
  left: -26px;
}

::v-deep .popup-content {
  position: relative;
  z-index: 1;
}

::v-deep .popup-title {
  font-weight: bold;
  color: #333;
}

::v-deep .popup-arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid white;
}
</style>