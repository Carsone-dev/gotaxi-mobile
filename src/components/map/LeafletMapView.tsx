import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LeafletMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  type: "available" | "partial" | "active" | "full";
  title: string;
  desc: string;
  toLat?: number;
  toLng?: number;
}

export interface LeafletRegion {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxBounds?: [[number, number], [number, number]];
}

export interface LeafletMapHandle {
  focusOn: (lat: number, lng: number) => void;
}

interface Props {
  markers?: LeafletMarker[];
  region?: LeafletRegion;
  style?: object;
  onMarkerPress?: (id: string) => void;
}

// ── Régions par pays (ajouter d'autres pays ici quand l'app s'étend) ────────

export const BENIN_REGION: LeafletRegion = {
  center: [9.3, 2.35],
  zoom: 7,
  minZoom: 6,
  maxBounds: [
    [5.5, 0.3],
    [13.0, 4.5],
  ],
};

export const COUNTRY_REGIONS: Record<string, LeafletRegion> = {
  BJ: BENIN_REGION,
};

// ── HTML Leaflet (tuiles CartoDB Voyager — gratuit, sans clé API) ────────────
// TODO production : héberger les tuiles soi-même ou utiliser Google Maps SDK

function buildMapHTML(region: LeafletRegion): string {
  const cfgJson = JSON.stringify(region);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#dde8d8}
#map{width:100%;height:100%}
.mp{width:22px;height:22px;border-radius:50% 50% 50% 0;border:2.5px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);position:relative}
.mpp{position:absolute;top:-5px;left:-5px;width:32px;height:32px;border-radius:50%;border:2px solid;animation:pu 2s infinite;pointer-events:none}
@keyframes pu{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.4);opacity:0}}
.leaflet-popup-content-wrapper{border-radius:12px!important;box-shadow:0 4px 16px rgba(0,0,0,.15)!important;padding:0!important}
.leaflet-popup-content{margin:10px 14px!important}
.leaflet-popup-tip-container{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var cfg=${cfgJson};
  var map=L.map('map',{center:cfg.center,zoom:cfg.zoom,zoomControl:false,attributionControl:false});

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19,
    subdomains:['a','b','c','d']
  }).addTo(map);

  if(cfg.maxBounds){
    map.setMaxBounds(cfg.maxBounds);
    map.options.minZoom=cfg.minZoom||6;
  }

  var mks=[],rts=[];

  window.clearMarkers=function(){
    mks.forEach(function(m){map.removeLayer(m)});
    rts.forEach(function(r){map.removeLayer(r)});
    mks=[];rts=[];
  };

  window.addMarkersData=function(data){
    data.forEach(function(m){
      var isActive=m.type==='active';
      var pin='<div style="position:relative"><div class="mp" style="background:'+m.color+'">'
        +(isActive?'<div class="mpp" style="border-color:'+m.color+'"></div>':'')
        +'</div></div>';
      var icon=L.divIcon({className:'',html:pin,iconSize:[22,22],iconAnchor:[11,22],popupAnchor:[1,-20]});
      var popup='<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif">'
        +'<b style="font-size:13px;display:block;margin-bottom:2px">'+m.title+'</b>'
        +'<span style="color:#666;font-size:12px">'+m.desc+'</span></div>';
      var mk=L.marker([m.lat,m.lng],{icon:icon}).addTo(map)
        .bindPopup(popup,{closeButton:false,maxWidth:220,minWidth:160});
      mk.on('click',function(){
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
          JSON.stringify({type:'markerPress',id:m.id})
        );
      });
      mks.push(mk);
      if(isActive&&m.toLat!=null&&m.toLng!=null){
        var pl=L.polyline([[m.lat,m.lng],[m.toLat,m.toLng]],{
          color:m.color,weight:3,dashArray:'8,5',opacity:.85
        }).addTo(map);
        rts.push(pl);
      }
    });
  };

  window.flyTo=function(lat,lng,zoom){
    map.flyTo([lat,lng],zoom||11,{duration:.5});
  };

  // Signaler que la carte est prête
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
    JSON.stringify({type:'ready'})
  );
})();
</script>
</body>
</html>`;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export const LeafletMapView = React.forwardRef<LeafletMapHandle, Props>(
  ({ markers = [], region = BENIN_REGION, style, onMarkerPress }, ref) => {
    const webRef = useRef<WebView>(null);
    const isReadyRef = useRef(false);
    const latestMarkersRef = useRef(markers);
    latestMarkersRef.current = markers;

    useImperativeHandle(
      ref,
      () => ({
        focusOn: (lat: number, lng: number) => {
          webRef.current?.injectJavaScript(`window.flyTo(${lat},${lng},11);true;`);
        },
      }),
      [],
    );

    // Met à jour les marqueurs quand les données arrivent (après que la carte est prête)
    useEffect(() => {
      if (!isReadyRef.current) return;
      const js = `window.clearMarkers();window.addMarkersData(${JSON.stringify(markers)});true;`;
      webRef.current?.injectJavaScript(js);
    }, [markers]);

    const handleMessage = useCallback(
      (e: WebViewMessageEvent) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.type === "ready") {
            isReadyRef.current = true;
            // Injecter les marqueurs déjà disponibles dès que la carte est initialisée
            const js = `window.clearMarkers();window.addMarkersData(${JSON.stringify(latestMarkersRef.current)});true;`;
            webRef.current?.injectJavaScript(js);
          } else if (d.type === "markerPress") {
            onMarkerPress?.(d.id);
          }
        } catch {}
      },
      [onMarkerPress],
    );

    const html = useMemo(() => buildMapHTML(region), [region]);

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={StyleSheet.absoluteFill}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
        />
      </View>
    );
  },
);

LeafletMapView.displayName = "LeafletMapView";

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
});
