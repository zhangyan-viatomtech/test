/**
 * 蓝牙连接状态回调
 *
 * @param {Object} response 返回值
 */
import jsInjection from "@/assets/js/ble/jsInjection"
import globalData from "@/assets/js/global"
import Crc8 from "@/assets/js/ble/checkingCRC";
import store from "@/store/index";
import {fromCharCode, intByte, intByte16} from "@/assets/js/common";
import axios from "axios";
import {Toast} from "vant";

let connectStatus = -1;//是否连接上 -1连接失败、0已连接、1未连接
let bleStatus = "";//蓝牙适配器是否可用，true表示可用，false表示不可用
let retryTimes = 0;//蓝牙连接次数
let timer = '';//定时器
let timeout = 0;//判断是否超时
let datas='';//返回数据
let typeNo = 0;//流水号
let command = '';//发送的命令
let fileSize = 0;
let fileData = [];
let type='00';
let data=[];
let samplePoints=[]

// jsInjection.setTitle(this.$t('IDS_temperature_measure_title'));
let deviceId = jsInjection.getDeviceId();
window.changeBleConnectionState = changeBleConnectionState;
window.changeServiceDiscoverState = changeServiceDiscoverState;
window.getBluetoothAdapterState = getBluetoothAdapterState;
window.changeCharacteristicsState = changeCharacteristicsState;

export let connectData = {
    /**
     * 连接蓝牙
     */
    openBluetooth(){
        // 判断手机蓝牙状态
        jsInjection.getBluetoothAdapterState("getBluetoothAdapterState");
        // 注册蓝牙连接的回调方法
        jsInjection.onBleConnectionStateChange("changeBleConnectionState");
        // 连接蓝牙
        jsInjection.createBleConnection(deviceId);
        // 开启定时器，定时器1s执行1次
        timer = setInterval(judgeTimeout, 1000);
    },
    /**
     * 断开蓝牙
     */
    beforeDestroy() {
        // 断开蓝牙连接
        jsInjection.closeBleConnection(deviceId);
        if (timer) {
            clearInterval(timer);
        }
    },
    /**
     * 监听
     */
    monitor(){
        // 注册发现服务的回调方法
        jsInjection.onBleServicesDiscovered("changeServiceDiscoverState");
        // 连接蓝牙
        jsInjection.createBleConnection(deviceId);
    },
    /**
     * 写入
     */
    writeCharacter(text){
        let value = '';
        if(text.substr(0,2)=='A5'){
            value = text.substr(0,text.length)
        }else{
            value = parseInt(text,16)
        }
        for(let i=0;i<value.length;i+=40){
            window.writeCharacteristicCallback  =  writeCharacteristicCallback;
            jsInjection.writeBLECharacteristicValue(
                deviceId,
                globalData.SERVICE_ID,
                globalData.WRITE_CHARACTERISTIC_ID,
                value.substring(i,i+40),
                "writeCharacteristicCallback"
            )
            command = value.substring(i,i+40)
            // console.log('发送'+value.substring(i,i+40))
        }

    },
    /**
     * 读取
     */
    read(){
        window.readBLECharacteristicValueCallback = readBLECharacteristicValueCallback;
        jsInjection.readBLECharacteristicValue(
            deviceId,
            globalData.BATTERY_SERVICE_ID,
            globalData.BATTERY_CHARACTERISTIC_ID,
            "readBLECharacteristicValueCallback"
        )
        console.log("读取")
    },
    /**
     * 发送命令
     */
    sendCommand(c,t,d){
        typeNo++;
        let text = ''
        let cmd = c
        store.state.cmd = cmd
        let cmd1 = parseInt(255-parseInt(cmd,16)).toString(16)
        if(cmd1.split('').length<2){
            cmd1 = '0' + cmd1
        }
        let type = t

        let len = '0000'
        let data = d
        if(data!=''){
            if(parseInt(data.length/2).toString(16).length<2){
                len =  '0'+parseInt(data.length/2).toString(16) + '00'
            }else{
                len =  parseInt(data.length/2).toString(16) + '00'
            }
        }
        let no = parseInt(typeNo).toString(16)
        if(no.length<2){
            no = '0'+no
        }else{
            no = no
        }
        if(typeNo >= 254){
            typeNo = 0
        }
        let crc = Crc8.calculationCrc8('A5'+ cmd + cmd1 + type + no + len + data)
        text = 'A5' + cmd + cmd1 + type + no + len + data + crc
        // console.log('A5'+',' + cmd+',' + cmd1+',' + type+',' + no+',' + len+',' + data+',' + crc)
        return text
    },
}
function writeCharacteristicCallback(res){
    const data = JSON.parse(res)
    // if(data.errCode==0){
    //     console.log('发送成功')
    // }
    store.commit("updateWriteStatus",data.errCode)
}
function readBLECharacteristicValueCallback(response){
    console.log("进入read回调"+response)
    const data = JSON.parse(response)
    store.commit("updateReadStatus",data.errCode)
    store.commit("getReadDate",data.data)
}
function changeBleConnectionState(response) {
    // 蓝牙连接状态变化的回调
    let result = JSON.parse(response);
    // console.log('蓝牙连接状态回调')
    // console.log(result)

    if (result && result.connected == true) {
        // 连接上
        connectStatus = "0";
        store.commit("updateConnectStatus",connectStatus)
        clearInterval(timer);
        console.log('蓝牙已连接')
    } else {
        // 获取手机蓝牙状态回调
        jsInjection.getBluetoothAdapterState("getBluetoothAdapterState");
        jsInjection.onBleCharacteristicValueChange("changeCharacteristicsState");
        // 手机蓝牙已打开时，最多尝试3次
        if (bleStatus && retryTimes < 3) {
            // 连接蓝牙
            retryTimes++;
            // jsInjection.closeBleConnection(deviceId);
            if (deviceId == null || deviceId.length <= 0) {
                deviceId = jsInjection.getDeviceId();
            }
            // 关闭蓝牙的时候会清除掉回调函数 所以需要重新注册
            jsInjection.onBleConnectionStateChange("changeBleConnectionState");
            jsInjection.onBleServicesDiscovered("changeServiceDiscoverState");
            jsInjection.createBleConnection(deviceId);
            timeout = 0;
            timer = setInterval(judgeTimeout, 1000);
        } else {
            clearInterval(timer);
            // jsInjection.closeBleConnection(deviceId);
        }
        console.log('连接失败')
        // 已断开或连接超时显示：连接失败
        connectStatus = "-1";
        store.commit("updateConnectStatus",connectStatus)
    }
}
/**
 * 手机蓝牙状态回调：判断手机蓝牙是否打开，未打开则显示连接失败
 *
 * @param {Object} response 返回值
 */
function getBluetoothAdapterState(response) {
    let result = JSON.parse(response);
    // console.log('getBluetoothAdapterState',result)
    if (result) {
        bleStatus = result.available;
    }
    if (bleStatus != true) {
        clearInterval(timer);
        connectStatus = -1;
        store.commit("updateConnectStatus",connectStatus)
        jsInjection.closeBleConnection(deviceId);
        if (timer) {
            clearInterval(timer);
        }
    }
}
/**
 * 发现服务的回调方法
 *
 * @param {Object} response 返回值
 */
function changeServiceDiscoverState(response) {
    // 监听是否发现服务
    let result = JSON.parse(response);
    // console.log('监听是否发现服务',result)
    if (result && result.errCode == 0) {
        // 成功发现服务，使设备主动上报数据
        connectStatus = "0";
        store.commit("updateConnectStatus",connectStatus)
        window.changeCharacteristicsState = changeCharacteristicsState;
        jsInjection.onBleCharacteristicValueChange("changeCharacteristicsState");
        let changeStatus = jsInjection.notifyBleCharacteristicValueChange(
            deviceId,
            store.state.SERVICE_ID,
            store.state.CHARACTERISTIC_ID,
            true
        );
        store.commit("updateMonitorStatus",changeStatus)
        if(changeStatus == 0){
            store.state.monitorState = true
            console.log("设置使能上报成功！")
        }else{
            store.state.monitorState = false
            console.log("设置使能上报失败！")
            // 设置使能上报失败
            connectStatus = "-1";
            store.commit("updateConnectStatus",connectStatus)
        }
    } else {
        // 异常处理
        connectStatus = "-1";
        store.commit("updateConnectStatus",connectStatus)
    }
}

/**
 * 特征值变化的回调函数
 *
 * @param {Object} response 返回值
 */
function changeCharacteristicsState(response) {
    let result = JSON.parse(response);
    // console.log('特征值变化的回调函数',result)
    if (result && result.characteristicId == globalData.NOTIFY_CHARACTERISTIC_ID && result.data) {
        // 开始解析数据
        parseData(result.data);
        // timeout = 0;
        // timer = setInterval(function (){
        //     timeout++;
        //     if (timeout >= 20) {
        //         connectData.writeCharacter(command)
        //         clearInterval(timer);
        //     }
        // }, 1000);
        // clearInterval(timer);
    } else {
        connectStatus = "-1";
        store.commit("updateConnectStatus",connectStatus)
        // console.log('连接失败')
    }
}
/**
 * 判断是否超时
 */
function judgeTimeout () {
    timeout++;
    // 超时时间为20s
    if (timeout >= 20) {
        connectStatus = "-1";
        store.commit("updateConnectStatus",connectStatus)
        clearInterval(timer);
        // jsInjection.closeBleConnection(deviceId);
    }
}
/**
 * 解析16进制
 */
function parseData(response){
    // console.log(response)
    datas += response
    let index = ''; // 字符出现的位置
    index = datas.indexOf('a5')
    while(index !== -1) {
        let cmd1 = datas.substr(index+2,2);
        let cmd2 = datas.substr(index+4, 2);
        if(parseInt(cmd1,16) == parseInt(store.state.cmd,16) && 255-parseInt(cmd1,16) == parseInt(cmd2,16)){
            let len1 = datas.substr(index+10,2);
            let len2 = datas.substr(index+12,2);
            let len = parseInt(len2+len1,16);
            let data = datas.substr(index,(len*2)+16)
            if(data.length/2 >= len+8){//判断是已经是一个完整的数据,如果完整就判断crc
                if(Crc8.inCrc8(data)){
                    let content = data.substr(14,data.length-16);
                    const type = data.substr(6,2);
                    const no = data.substr(8,2);
                    const crc = data.substr(data.length-2,2);
                    const obj = {
                        data: data,
                        cmd1: cmd1,
                        cmd2: cmd2,
                        type: type,
                        no: no,
                        content: content,
                        crc: crc,
                    }
                    commit(obj)
                    datas = ''
                }
            }
        }
        index = datas.indexOf('a5',index + 1); // 从字符串出现的位置的下一位置开始继续查找
    }

    // console.log(response,',',data)

}
function commit(obj){
    let state = ""
    if(obj.cmd1 == 'E1' || obj.cmd1 == 'e1'){
        state = "getCharacterData"
    }else if(obj.cmd1 == 'F1' || obj.cmd1 == 'f1'){
        // state = "getFileListInfo"
        FileList(obj)
    }else if(obj.cmd1 == 'F2' || obj.cmd1 == 'f2'){
        // state = "getFileReadStartInfo"
        FileReadStart(obj)
    }else if(obj.cmd1 == 'F3' || obj.cmd1 == 'f3'){
        // state = "getFileReadInfo"
        FileRead(obj)
    }else if(obj.cmd1 == '02'){
        // state = "getDeviceRunStatus"
        DeviceRunParameters(obj)
    }else if(obj.cmd1 == '03'){
        state = "getRealTimeDataInfo"
    }else if(obj.cmd1 == 'F9' || obj.cmd1 == 'f9'){
        state = "getUserListInfo"
    }
    store.commit(state,obj)
    // if(store.state.cmd != 'F3'){
    //     store.commit(state,obj)
    // }

}
function secondToTimeStr(t) {
    if (!t) return;
    if (t < 60) return "00:"+"00:" + ((i = t) < 10 ? "0" + i : i);
    if (t < 3600) return "00:" + ((a = parseInt(t / 60)) < 10 ? "0" + a : a) + ":" + ((i = t % 60) < 10 ? "0" + i : i);
    if (3600 <= t) {
        var a, i, e = parseInt(t / 3600);
        return (e < 10 ? "0" + e : e) + ":" + ((a = parseInt(t % 3600 / 60)) < 10 ? "0" + a : a) + ":" + ((i = t % 60) < 10 ? "0" + i : i);
    }
}
function DeviceRunParameters(obj){ //获取设备运行参数
    const content = obj.content
    if (content) {
        const hr = content.substr(0, 4)
        const sysFlag = parseInt(content.substr(4, 2), 16)
        const percent = parseInt(content.substr(6, 2), 16)
        const recordTime = content.substr(8, 8)
        const runStatus = parseInt(content.substr(16, 2), 16)%8
        const reserved = content.substr(18, 22)
        let fileName = fromCharCode(reserved)
        let obj = {
            hr,
            sysFlag,
            percent,
            recordTime,
            runStatus,
            reserved
        }
        store.state.deviceRunParametersInfo = obj
        // return obj
    }
}
function FileList(obj) { //读文件列表
    const content = obj.content
    if (content) {
        const fileNum = parseInt(content.substr(0, 2), 16)
        let value = ''
        let fileName = ''
        let fileTime=''
        let monthTime=''
        let startTime=''
        let fileNameArray = []
        let arr = []
        const data = content.substr(2, content.length)
        for (let j = 0; j < data.length; j += 32) {
            value = data.substr(j, 32)
            // for(let i=0;i<value.length;i+=2){
            //     if(String.fromCharCode(parseInt(value.substring(i,i+2),16))!=''){
            //         fileName += String.fromCharCode(parseInt(value.substring(i,i+2),16))
            //     }
            // }
            // if (fileName.lastIndexOf(" ") == -1){
            //     fileName = fileName.substring(0,fileName.length-1);
            // }
            fileTime=fromCharCode(value).substr(9,2)+':'+fromCharCode(value).substr(11,2)+':'+fromCharCode(value).substr(13,2)
            fileName = fromCharCode(value).substr(1,4)+'/'+fromCharCode(value).substr(5,2)+'/'+fromCharCode(value).substr(7,2)
            monthTime= fromCharCode(value).substr(1,4)+'年'+fromCharCode(value).substr(5,2)+'月'
            startTime=fromCharCode(value).substr(1,4)+'-'+fromCharCode(value).substr(5,2)+'-'+fromCharCode(value).substr(7,2)+' '+fileTime
            arr.push({
                oldName: value,
                Name: fileName,
                fileTime:fileTime,
                monthTime:monthTime,
                startTime:startTime
            })
            fileNameArray = arr.filter(function (item, index, array) {
                //元素值，元素的索引，原数组。
                return (item.oldName.substr(0, 2) == '52');
            });
        }
        // let obj = {
        //     fileNum,
        //     fileName: fileNameArray
        // }
        store.state.fileListInfo = fileNameArray
        let DBFileList=JSON.parse(localStorage.getItem('DBFileList'))
        // console.log(DBFileList,'DBFileList-缓存')
        if(DBFileList!==null){
          store.state.InFileList = getArrDownLoadData(DBFileList,fileNameArray);
        }else {
           store.state.InFileList=fileNameArray
        }
        if (store.state.InFileList.length==0||store.state.InFileList.length==undefined) {
            store.state.circleStatus=false
            store.state.syncStatus=false
        }
        else {
            store.state.DownNum=store.state.InFileList.length
            store.state.allNum= store.state.InFileList.length
            store.state.circleStatus=true//显示下载
            store.state.syncStatus=true
            writeCharacter('F2')//第一次读文件数据
            for (let j = 0; j < store.state.InFileList.length; j++) {
                AddList(j);
            }
        }
        return fileNameArray
    }
}
function FileReadStart(obj) { //读文件开始
    store.state.downLoadStatus=-1//进入同步页面在同步中。。
    const content = obj.content
    if (content) {
        fileSize = intByte(content)
        let obj = {
            fileSize
        }
        store.state.fileSize=fileSize
        // store.commit("getFileOffset",fileSize)
        store.state.fileOffset=0
        store.state.FileReadfinish = false
        store.state.fileStartfinish = true
        store.state.fileReadStartInfo=fileSize
        const value1 = connectData.sendCommand('F3', '00', '00000000')
        connectData.writeCharacter(value1)
        return fileSize
    }
}
function FileRead(obj){
    // console.log('读文件数据state.fileReadInfo', obj)
    const content = obj.content
    let contentOutput = []
    let ecgDataOutput=[]//分析用的数据
    let fileDataList=''
    store.state.fileStartfinish = false
    if (content) {
        let num = parseInt(store.state.fileOffset) + (content.length / 2)
        if (num < fileSize) {
            fileData.push(content)
            // console.log('读文件数据fileData1', fileData)
            store.commit("getFileData", store.state.fileData + content)
            store.commit("getFileOffset", num)
            const data = intByte16(num)
            const value = connectData.sendCommand('F3', '00', data)
            connectData.writeCharacter(value)
        } else if (num === fileSize) {
            fileData.push(content)
            // console.log('读文件数据fileData2', fileData)
            store.commit("getFileData", store.state.fileData + content)
            store.commit("getFileOffset", num)
            store.commit("setEndTime", Date.parse(new Date()))
            store.commit("getRate", fileSize)
            if(fileData){
                //console.time("测试滤波速度: ")
                for (let index = 0; index < fileData.length; index++) {
                    fileDataList = fileDataList+fileData[index];
                }
                let times=fileDataList.substr(fileDataList.length-40,8)
                // let recordingTime=secondToTimeStr(intByte(times))
                let recordingTime=intByte(times)
                const contentInput=fileDataList.substr(20,fileDataList.length-60)
                let unComNum = 0
                let lastComData = 0
                let ecgData = ''
                const comMaxVal =127			//压缩最大值
                const comMinVal =-127			//压缩最小值
                const COM_EXTEND_MAX_VAL =382	//压缩扩展最大值
                const COM_EXTEND_MIN_VAL = -382	//压缩扩展最小值
                const comRetOriginal = -128		//需要保存原始值返回值
                const comRetPostTive = 127		//需要保存扩展数为正数返回值
                const comRetNegative = -127	//需要保存扩展数为负数返回值
                const uncomRetInvali= -32768		//解压无需处理返回值
                for(let i = 0; i < contentInput.length; i+=2){			//contentInput.length为输入长度
                    let ecgCompressData = parseInt(contentInput.substr(i, 2), 16)
                    if(ecgCompressData>127){
                        ecgCompressData-=256
                    }
                    switch (unComNum) {
                        case 0:
                            if (ecgCompressData === comRetOriginal) {
                                unComNum = 1;
                                ecgData = uncomRetInvali;
                            } else if (ecgCompressData === comRetPostTive){//正
                                unComNum = 3;
                                ecgData = uncomRetInvali;
                            } else if (ecgCompressData ===comRetNegative) {//负
                                unComNum = 4;
                                ecgData = uncomRetInvali;
                            } else {
                                ecgData = lastComData + ecgCompressData;
                                lastComData = ecgData;
                            }
                            break;
                        case 1:			//原始数据字节低位
                            lastComData = ecgCompressData;
                            unComNum = 2;
                            ecgData = uncomRetInvali;
                            break;
                        case 2:			//原始数据字节高位
                            // console.log('lastComData:',lastComData)
                            // console.log('ecgCompressData:',ecgCompressData)
                            if (ecgCompressData < 0) {
                                ecgCompressData = 256 + ecgCompressData;
                            }
                            ecgData = (lastComData&0xFF) | (ecgCompressData * 256);
                            if(ecgData > 32767){
                                ecgData -= 65536
                            }
                            lastComData = ecgData;
                            unComNum = 0;
                            // console.log('ecgData:',ecgData)
                            break;
                        case 3:
                            if(ecgCompressData<0) {
                                ecgCompressData = 256 + ecgCompressData
                            }
                            ecgData = comMaxVal + (lastComData + ecgCompressData);
                            lastComData = ecgData;
                            unComNum = 0;
                            break;
                        case 4:
                            if(ecgCompressData<0) {
                                ecgCompressData = 256 + ecgCompressData
                            }
                            ecgData =comMinVal+ (lastComData - ecgCompressData);
                            lastComData = ecgData;
                            unComNum = 0;
                            break;
                        default:
                            break;
                    }
                    if(ecgData>32767){
                        ecgData-=65536
                    }
                    if (ecgData !== uncomRetInvali) {
                        ecgDataOutput.push(ecgData)
                        ecgData = ecgData * 0.002467
                        contentOutput.push(ecgData)
                    }
                }
                let obj = {
                    ecgDataOutput,
                    contentOutput,
                    recordingTime,
                }
                store.state.fileReadInfo=obj
                fileData=[]
                const value = connectData.sendCommand('F4', '00', [])
                connectData.writeCharacter(value)
                store.state.ProgressSecond=(num/store.state.fileSize)*100
                Add(store.state.startIndex)//下载一条添加到数据库中
                store.state.startIndex++
                if(store.state.startIndex < store.state.InFileList.length){
                    let data = store.state.InFileList[store.state.startIndex].oldName+ "00000000"
                    const value1 = connectData.sendCommand('F2', '00', data)
                    connectData.writeCharacter(value1)
                }
                else {
                    store.state.circleStatus=false
                    store.state.syncStatus=false
                    store.state.startIndex=0//次数置零
                    store.state.downLoadStatus=0//同步成功了
                    Toast('数据同步成功')
                    window.BasicLib.container.keepScreenOn(false); //屏幕常亮接口
                    let loc=JSON.parse(localStorage.getItem('DBFileList'))
                    if(loc!=null){
                        let allList= store.state.InFileList.concat(JSON.parse(localStorage.getItem('DBFileList')))
                        localStorage.setItem('DBFileList',JSON.stringify(allList))
                    }
                    else {
                        let allList= store.state.InFileList
                        localStorage.setItem('DBFileList',JSON.stringify(allList))
                    }
                    store.state.lastSyncTime= store.state.InFileList[store.state.InFileList.length-1].Name+'  '+ store.state.InFileList[store.state.InFileList.length-1].fileTime
                    localStorage.setItem('lastSyncTime',store.state.lastSyncTime)
                }
                // return obj
            }
        }
        store.state.ProgressSecond=(num/store.state.fileSize)*100
        // console.log('state.ProgressSecond2',state.ProgressSecond)
        // return {
        //     fileData
        // }

    }
}
function writeCharacter(text){
    let value = ''
    if(text!=''){
        if (text == "F2") {
            let fileList = store.state.InFileList
            data = fileList[store.state.startIndex].oldName+ "00000000";
        }
        value = connectData.sendCommand(text,type,data)
    }else{
        store.state.cmd = text.substr(2,2)
        value = connectData.sendCommand(text,type,data)
    }
    connectData.writeCharacter(value)
}
function Add(i) {
    let t=new Date(store.state.InFileList[i].startTime);
    let t_s=t.getTime();
    // let nt=new Date();
    // let endTime=nt.setTime(t_s+store.state.fileReadInfo.recordingTime);
    // let nt=new Date();
    let rawdate= new Date(t_s)
    var addSecond = parseInt(store.state.fileReadInfo.recordingTime);
    var endTime = new Date(rawdate.setSeconds(rawdate.getSeconds() + addSecond)).getTime();
    // 建立读写事务,向对象仓库写入数据记录
    let request =store.state.db.transaction(['DBFileData'], 'readwrite').objectStore('DBFileData').add({
        startFileIndex:i,
        ecgDataOutput:store.state.fileReadInfo.ecgDataOutput,
        value: store.state.fileReadInfo.contentOutput,
        recordingTime:store.state.fileReadInfo.recordingTime,
        id:  store.state.InFileList[i].oldName,
        Name:  store.state.InFileList[i].Name,
        fileTime: store.state.InFileList[i].fileTime,
        monthTime: store.state.InFileList[i].monthTime,
        startRecordTime:store.state.InFileList[i].startTime,
        startTime:t_s+'000000',
        endTime:endTime+'000000'
    })
    request.onsuccess = event => {
        console.log('新增成功')
        // saveTemperatureData(i)//往数据平台保存数据
        store.state.DownNum=store.state.DownNum-1
        let start=t_s+'000000'
        let end=endTime+'000000'
        ReportEcgCollect(store.state.fileReadInfo.contentOutput,start,end)//上报到华为服务器
    };
    request.onerror = event => {
        console.log('重复数据写入失败')
    }
}
function AddList(i) {
    //文件列表数据添加
    // 建立读写事务,向对象仓库写入数据记录
    let request = store.state.db
        .transaction(["DBFileList"], "readwrite")
        .objectStore("DBFileList")
        .add({
            id: store.state.InFileList[i].oldName,
            oldName: store.state.InFileList[i].oldName,
            Name: store.state.InFileList[i].Name,
            fileTime: store.state.InFileList[i].fileTime,
            monthTime: store.state.InFileList[i].monthTime
        });
    request.onsuccess = event => {
        // localStorage.setItem('DBFileList',JSON.stringify(store.state.InFileList))
    };
    request.onerror = event => {
        console.log("重复数据写入失败");
    };
}
function getArrDownLoadData(arr1,arr2){
    var result = [];
    for(var i = 0; i < arr2.length; i++){
        var obj = arr2[i];
        var id = obj.oldName;
        var isExist = false;
        for(var j = 0; j < arr1.length; j++){
            var aj = arr1[j];
            var n = aj.oldName;
            if(n == id){
                isExist = true;
                break;
            }
        }
        if(!isExist){
            result.push(obj);
        }
    }
    return result;
}
function ReportEcgCollect(arr,startTime,endTime){
    //上报ECG明细
    let voltagedatas = arr.map(item=>item*405)
    let data= {
        "dataCollectorId":store.state.collectorId,
        "endTime":1904366048000000000,
        "startTime":1609380000000000000,
        "samplePoints":[
        {
            "dataTypeName":"com.huawei.continuous.ecg_detail",
            "endTime":endTime,
            "startTime":startTime,
            "value":[
                {
                    "fieldName":"ecg_type",
                    "integerValue":1
                },
                {
                    "fieldName":"voltage_datas",
                    "stringValue":JSON.stringify(voltagedatas)
                }
            ]
        }
    ]
    }
    console.log(data,'上报ECG明细-data')
    axios({
        method: 'PATCH',
        withCredentials: true,
        // url: '/healthkitapi/v1/profile/privacyRecords',
        url:store.state.domain+'/healthkit/v1/dataCollectors/'+encodeURIComponent(data.dataCollectorId)+'/sampleSets/1609380000000000000-1904366048000000000',
        headers: {
            "Content-Type":"application/json; charset=UTF-8",
            "Authorization":"Bearer "+store.state.access_token
        },
        data:data
    }).then((response)=>{
        console.log(response,'上报ECG明细=response')
    }).catch((err)=>{
        console.log('err',err)
        // this.refresh_token()
        // this.load()
    })
}
export const pushHistory = () => {
    let state = { title: '', url: '' }
    window.history.pushState(state, state.title, state.url)
}
/**
 * 往数据平台保存数据
 */
function saveTemperatureData(i){
    let detail_Data = store.state.fileReadInfo.contentOutput.map(item=>item*405)
    let param={
        "averageHeartRate":'88',
        "dataSources":'HUAWEI',
        "ecgAppVersion":'V1.0.0.33',
        "ecgArrhyType":0,
        "ecgDataLength":store.state.fileReadInfo.contentOutput.length,
        "packageName":"com.huawei.health.ecg.collection",
        "userSymptom":0
    }
    let t=new Date(store.state.InFileList[i].startTime);
    let t_s=t.getTime();
    let nt=new Date();
    let endTime=nt.setTime(t_s+store.state.fileReadInfo.recordingTime);
    let dataParams = {
        "startTime": Date.parse(store.state.InFileList[i].startTime),
        "endTime":endTime,
        "type": 31001,
        "value": {
            "meta_data":JSON.stringify(param),
            "simple_data":[0.1],
            "detail_data":detail_Data,
        }
    };
    // store.state.DownNum=store.state.DownNum-1
    window.saveBloodSugarDataCallback = saveBloodSugarDataCallback;
    jsInjection.saveMeasure(JSON.stringify(dataParams), "saveBloodSugarDataCallback");
}
function saveBloodSugarDataCallback (resultCode) {
    console.log("saveBloodSugarDataCallback: " + resultCode);
}

