import * as types from './mutations-type';
import Vue from 'vue'
import {Drawing} from "@/assets/js/ble/canvas"
let waveDatas = []
const mutations = {
    [types.SUM_ADD](state,payLoad){
        state.num += payLoad.unit;
    },
    updateConnectStatus(state,status){
        state.connectStatus = status
    },
    updateWriteStatus(state,status){
        state.writeStatus = status
    },
    updateReadStatus(state,status){
        state.writeStatus = status
    },
    updateMonitorStatus(state,status){
        state.monitorStatus = status
    },
    getReadDate(state,data){
        state.readDate = data
    },
    getCharacterData(state,data){
        Vue.set(state,'characterData',data)
    },
    getBatteryInfo(state,data){
        Vue.set(state,'batteryInfos',data)
    },
    getStartFirmwareInfo(state,data){
        Vue.set(state,'startFirmwareInfo',data)
    },
    getFirmwareInfo(state,data){
        Vue.set(state,'firmwareInfo',data)
    },
    getFactoryConfigInfo(state,data){
        Vue.set(state,'factoryConfigInfo',data)
    },
    getTemperatureInfo(state,data){
        Vue.set(state,'temperatureInfo',data)
    },
    getFileListInfo(state,data){
        Vue.set(state,'fileListInfo',data)
    },
    getFileReadStartInfo(state,data){
        Vue.set(state,'fileReadStartInfo',data)
    },
    getFileReadInfo(state,data){
        Vue.set(state,'fileReadInfo',data)
    },
    getRealTimeWaveformInfo(state,data){
        Vue.set(state,'realTimeWaveformInfo',data)
    },
    getDeviceRunParameters(state,data){
        Vue.set(state,'deviceRunParametersInfo',data)
    },
    getDeviceRunStatus(state,data){
        Vue.set(state,'deviceRunStatusInfo',data)
    },
    getRealTimeDataInfo(state,data){
        Vue.set(state,'realTimeDataInfo',data)
    },
    getFileOffset(state,data){
        Vue.set(state,'fileOffset',data)
    },
    getFileData(state,data){
        Vue.set(state,'fileData',data)
    },
    setStartTime(state,data){
        Vue.set(state,'startTime',data)
    },
    setEndTime(state,data){
        Vue.set(state,'endTime',data)
    },
    getRate(state,data){
        const rate = (parseInt(data)/1024)/((parseInt(state.endTime) - parseInt(state.startTime))/1000)
        state.rate = rate.toFixed(2)
    },
    getUserListInfo(state,data){
        Vue.set(state,'userListInfo',data)
    },
}
export default mutations;