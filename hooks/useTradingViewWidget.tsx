'use client'
import { useEffect,useRef } from "react"

const useTradingViewWidget = (scriptUrl :String, config:Record<string,unknown>, height = 600) => {
    const containerRef = useRef<HTMLDivElement | null>(null)

      useEffect(() => {
      if(!containerRef.current) return
      if(containerRef.current.dataset.loaded) return
      containerRef.current.innerHTML= `<div class = "tradingview-widget-container__widget"`


      const script = document.createElement("script");
      script.src = scriptUrl as string;
      script.async = true;
      script.innerHTML = JSON.stringify(config);
      containerRef.current.appendChild(script);
      containerRef.current.dataset.loaded= 'true'

      return()=>{
        if(containerRef.current){
            containerRef.current.innerHTML = ''
            delete containerRef.current.dataset.loaded
        }
      }

    },
    [scriptUrl,config,height]
  );

    return containerRef

}

export default useTradingViewWidget

