<template>
  <!-- 地图容器 - 用于挂载OpenLayers地图 -->
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
// Vue相关功能导入
import { ref, onMounted } from 'vue'
// OpenLayers核心模块导入
import { Map, View } from 'ol'  // 地图和视图类
import { fromLonLat } from 'ol/proj'  // 坐标转换工具
import TileLayer from 'ol/layer/Tile'  // 瓦片图层
import XYZ from 'ol/source/XYZ'  // XYZ格式的瓦片数据源
import VectorLayer from 'ol/layer/Vector'  // 矢量图层
import VectorSource from 'ol/source/Vector'  // 矢量数据源
import { GeoJSON } from 'ol/format'  // GeoJSON格式解析器
import Feature from 'ol/Feature'  // 地理要素类
import LineString from 'ol/geom/LineString'  // 线几何图形
import Point from 'ol/geom/Point'  // 点几何图形
import { defaults, ScaleLine } from 'ol/control'  // 地图控件
import { Style, Stroke, Circle, Fill, Text, RegularShape } from 'ol/style';
import Overlay from 'ol/Overlay'  // 覆盖物
import dataObj from './data.json'  // 导入路线数据

// 地图容器引用
const mapContainer = ref(null)

// 组件挂载后初始化地图
onMounted(async() => {
  // 高德地图安全密钥配置
  window._AMapSecurityConfig = {
    securityJsCode: "12e57513f121f13436989b40d96bfd7c",
  };
  
  if (mapContainer.value) {
    // 创建地图实例
    const map = new Map({
      target: mapContainer.value,  // 挂载到DOM元素
      layers: [
        // 底图图层 - 使用高德地图服务
        new TileLayer({
          source: new XYZ({
            url: 'https://webst0{1-4}.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
            attributions: '© <a href="https://www.amap.com/">高德地图</a>',
            tileSize: 256,  // 瓦片大小
            crossOrigin: 'anonymous'  // 跨域设置
          })
        })
      ],
      // 地图视图配置
      view: new View({
        projection: 'EPSG:3857',  // 使用Web墨卡托投影
        center: fromLonLat([116.397, 39.908]),  // 初始中心点(北京)
        zoom: 5  // 初始缩放级别
      }),
      // 地图控件配置
      controls: defaults({
        zoom: true,  // 启用缩放控件
        zoomOptions: {
          className: 'custom-zoom',  // 自定义样式类
          zoomInLabel: '+',  // 放大按钮标签
          zoomOutLabel: '-',  // 缩小按钮标签
          delta: 1  // 缩放步长
        }
      }).extend([
        // 添加比例尺控件
        new ScaleLine({
          units: 'metric',  // 使用公制单位
          bar: true,  // 显示条形比例尺
          steps: 4,  // 刻度数量
          text: true,  // 显示文字
          minWidth: 100  // 最小宽度
        })
      ])
    });

    // 定义路线起点、终点和途经点
    const start = [112.938, 28.229]; // 长沙
    const end = [116.397, 39.908]; // 北京
    const waypoints = [
      [114.892, 27.797], // 新余
      [116.358, 29.292], // 九江
      [117.283, 31.867]  // 合肥
    ];

    // 从JSON文件加载路线坐标
    const routeCoords = dataObj.data;
    console.log('routeCoords', routeCoords)

    // 创建GeoJSON格式的路线要素
    const initialFeatures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoords  // 路线坐标点数组
          },
          properties: {
            routeId: 'CS-BJ-001',  // 路线ID
            status: 'in-transit'  // 路线状态
          }
        }
      ]
    }

    // 创建矢量数据源并加载GeoJSON数据
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(initialFeatures)
    });

    // 创建矢量图层并设置样式
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: {
        'stroke-color': '#3388ff',  // 线条颜色
        'stroke-width': 3  // 线条宽度
      }
    });

    // 将矢量图层添加到地图
    map.addLayer(vectorLayer);

    // 创建路线样式
    const routeStyle = new Style({
      stroke: new Stroke({
        color: '#3388ff',
        width: 4
      })
    });

    // 创建标记点样式
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
        text: '',  // 初始无文字
        font: 'bold 12px Microsoft YaHei',  // 字体设置
        fill: new Fill({ color: '#ffffff' }),  // 白色文字
        offsetY: 0,  // Y轴偏移
        textAlign: 'center'  // 文字居中
      })
    });
    
    // 创建起点标记
    const startMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[0])),
      name: '起点',
      type: 'start'  // 标记类型为起点
    });
    const startStyle = markerStyle.clone();
    startStyle.getText().setText('起');  // 设置起点文字
    startMarker.setStyle(startStyle);
    
    // 创建终点标记
    const endMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[1])),
      name: '终点',
      type: 'end'  // 标记类型为终点
    });
    const endStyle = markerStyle.clone();
    endStyle.getText().setText('终');  // 设置终点文字
    endMarker.setStyle(endStyle);
    
    // 添加地图点击事件处理
    map.on('click', (evt) => {
      // 获取点击位置的要素
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      // 如果是起点或终点标记
      if (feature && (feature.get('type') === 'start' || feature.get('type') === 'end')) {
        const name = feature.get('name');
        const coordinates = feature.getGeometry().getCoordinates();
        // 创建信息弹窗
        const overlay = new Overlay({
          element: createPopupElement(name),
          position: coordinates,
          offset: [0, 0]
        });
        map.addOverlay(overlay);
        
        // 点击其他地方时移除弹窗
        map.once('click', () => {
          map.removeOverlay(overlay);
        });
      }
    });
    
    // 创建弹窗元素的函数
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
    // 创建更精致的车辆样式
    const vehicleStyle = new Style({
      text: new Text({
        text: '🚚',  // 使用emoji卡车图标
        font: 'bold 20px Arial',
        offsetY: 0,
        fill: new Fill({ color: '#000000' }),
        rotation: 20
      })
    });

    // 创建路线要素
    const routeFeature = new Feature({
      geometry: new LineString(
        initialFeatures.features[0].geometry.coordinates.map(coord => fromLonLat(coord))
      ),
      name: '导航路线'
    });
    routeFeature.setStyle(routeStyle);
    
    // 创建车辆标记
    const vehicleMarker = new Feature({
      geometry: new Point(fromLonLat(initialFeatures.features[0].geometry.coordinates[0])),
      name: '车辆'
    });
    vehicleMarker.setStyle(vehicleStyle);

    // 将所有要素添加到数据源
    vectorSource.addFeatures([routeFeature, startMarker, endMarker, vehicleMarker]);

    // 调整视图以显示整个路线
    map.getView().fit(routeFeature.getGeometry(), {
      padding: [50, 50, 50, 50],  // 四周留白
      maxZoom: 10  // 最大缩放级别
    });
    
    // 车辆移动动画
    let step = 0;
    const timer = setInterval(() => {
      const coordinates = initialFeatures.features[0].geometry.coordinates;
      
      // 数据验证
      if (!coordinates || coordinates.length < 2) {
        clearInterval(timer);
        return;
      }

      // 计算动画进度
      const progress = step / 100;
      const segmentLength = 1 / (coordinates.length - 1);
      const segmentIndex = Math.min(Math.floor(progress / segmentLength), coordinates.length - 2);
      const segmentProgress = (progress % segmentLength) / segmentLength;
      
      // 获取当前线段起点和终点
      const startCoord = coordinates[segmentIndex];
      const endCoord = coordinates[segmentIndex + 1];
      
      // 确保坐标存在
      if (!startCoord || !endCoord) {
        clearInterval(timer);
        return;
      }

      // 计算车辆新位置
      const newCoord = [
        startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress,
        startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress
      ];
      
      // 更新车辆位置
      vehicleMarker.getGeometry().setCoordinates(fromLonLat(newCoord));
      
      // 动画完成后清除定时器
      if(++step > 100) clearInterval(timer);
    }, 50);  // 每50毫秒更新一次
  }
});

// 高德地图API请求函数
async function getRouteFromAMap(start, end, waypoints = []) {
  const key = 'eb95ed6a0f3107efe0d93256b17800dc'; // API密钥
  const waypointsStr = waypoints.map(p => `${p[0]},${p[1]}`).join('|');
  const url = `https://restapi.amap.com/v3/direction/driving?origin=${start[0]},${start[1]}&destination=${end[0]},${end[1]}&waypoints=${waypointsStr}&key=${key}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === '1') {
      // 处理返回的路线数据
      return data.route.paths[0].steps.flatMap(step => 
        step.polyline.split(';').map(p => {
          const [lng, lat] = p.split(',');
          return [parseFloat(lng), parseFloat(lat)];
        })
      );
    }
    return [];
  } catch (error) {
    console.error('获取路线失败:', error);
    return [];
  }
}
</script>

<style>
/* 导入OpenLayers默认样式 */
@import 'ol/ol.css';
</style>

<style scoped>
/* 地图容器样式 */
.map-container {
  width: 100%;
  height: 100vh;  /* 全屏高度 */
  background-color: #f0f0f0;
  position: relative;
}

/* 弹窗样式 */
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

/* 弹窗箭头样式 */
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