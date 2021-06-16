import {
    intByte,
    intByte16,
    fromCharCode
} from "@/assets/js/common"
import store from "@/store/index";
import {
    connectData
} from "@/assets/js/ble/public"
let fileSize = 0;
let fileData = [];
import {wavelet_filter_convert} from "@/assets/js/ble/waveFiltering"
let reset = 1
let FileListdata = []
const getters = { //公共的计算属性
    deviceInfo: (state) => { //获取设备信息
        if (state.characterData != '') {
            const content = state.characterData.content
            const hwVersion = String.fromCharCode(parseInt(content.substr(0, 2), 16));
            const fwVersion = parseInt(content.substr(4, 2)) + '.' + parseInt(content.substr(6, 2)) + '.' + parseInt(content.substr(8, 2))
            const blVersion = parseInt(content.substr(12, 2)) + '.' + parseInt(content.substr(14, 2)) + '.' + parseInt(content.substr(16, 2))
            const branchCode = content.substr(18, 16)
            let branchCodeList = '';
            for (let i = 0; i < branchCode.length - 1; i += 2) {
                branchCodeList += String.fromCharCode(parseInt(branchCode.substring(i, i + 2), 16))
            }
            const fsVersion = parseInt(content.substr(34, 2), 16)
            const reserved0 = parseInt(content.substr(36, 4), 16)
            const deviceType = content.substr(40, 4)
            const protocolVersion = parseInt(content.substr(44, 2)) + '.' + parseInt(content.substr(46, 2))
            const curTime = content.substr(48, 14)
            const protocolDataMaxLen = parseInt(content.substr(62, 4), 16)
            const reserved1 = parseInt(content.substr(66, 4), 16)
            const len = parseInt(content.substr(70, 2), 16)
            const serialNum = parseInt(content.substr(72, 36), 16)
            const reserved2 = parseInt(content.substr(108, 4), 16)
            let obj = {
                hwVersion, //硬件版本
                fwVersion, //固件版本
                blVersion, //引导版本
                branchCodeList, //Branch编码
                fsVersion, //文件系统版本
                reserved0, //预留
                deviceType, //设备类型
                protocolVersion, //协议版本
                curTime, //时间
                protocolDataMaxLen, //通信协议数据段最大长度，不包括固定字节
                reserved1, //预留
                SN: {
                    len: len, //SN长度(小于18)
                    serialNum: serialNum, //SN号
                },
                reserved2, //预留
            }
            return obj
        }
    },
    BatteryInfo: (state) => { //获取电池状态
        const content = state.batteryInfos.content
        if (content) {
            const state = parseInt(content.substr(0, 2), 16)
            const percent = parseInt(content.substr(2, 2), 16)
            let text = parseInt(content.substr(4, 4), 16)
            let voltage = 0
            if (parseInt(text) > 0) {
                voltage = voltage.substr(0, 1) + '.' + voltage.substr(1, voltage.length - 1)
            }
            let obj = {
                state, //电池状态0:正常使用 1:充电中 2:充满 3:低电量
                percent, //电池状态  电池电量百分比
                voltage, //电池电压
            }
            return obj
        }
    },
    FileList: (state) => { //读文件列表
        const content = state.fileListInfo.content
        console.log('读文件列表:',content)
        if (content) {
            const fileNum = parseInt(content.substr(0, 2), 16)
            let value = ''
            let fileName = ''
            let fileTime=''
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
                fileTime=fromCharCode(value).substr(9,6)
                fileName = fromCharCode(value).substr(1,4)+'年'+fromCharCode(value).substr(5,2)+'年'+fromCharCode(value).substr(7,2)+'日'
                arr.push({
                    oldName: value,
                    Name: fileName,
                    Time:fileTime,
                })
                fileNameArray = arr.filter(function (item, index, array) {
                    //元素值，元素的索引，原数组。
                    return (item.oldName.substr(0, 2) === '52');
                });
            }

            // let obj = {
            //     fileNum,
            //     fileName: fileNameArray
            // }
            FileListdata = fileNameArray
            return fileNameArray
        }
    },
    FileReadStart: (state) => { //读文件开始
        const content = state.fileReadStartInfo.content
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
            return fileSize
        }
    },
    FileRead: (state) => { //读文件数据
        console.log('读文件数据state.fileReadInfo', state.fileReadInfo)
        const content = state.fileReadInfo.content
        let contentOutput = []
        let fileDataList=''
        store.state.fileStartfinish = false
        if (content) {
            let num = parseInt(state.fileOffset) + (content.length / 2)
            console.log('读文件数据num',num)
            console.log('读文件数据fileSize',fileSize)
            if (num < fileSize) {
                fileData.push(content)
                // console.log('读文件数据fileData1', fileData)
                store.commit("getFileData", state.fileData + content)
                store.commit("getFileOffset", num)
                const data = intByte16(num)
                const value = connectData.sendCommand('F3', '00', data)//读文件数据
                connectData.writeCharacter(value)
            } else if (num === fileSize) {
                fileData.push(content)
                console.log(num , fileSize)
                console.log('读文件数据fileData2', fileData)
                store.commit("getFileData", state.fileData + content)
                store.commit("getFileOffset", num)
                store.commit("setEndTime", Date.parse(new Date()))
                store.commit("getRate", fileSize)
                if(fileData){
                    for (let index = 0; index < fileData.length; index++) {
                        fileDataList = fileDataList+fileData[index];
                    }
                    let recordingTimes=fileDataList.substr(38,8)
                    console.log(recordingTimes,'recordingTimes')
                    state.recordingTime=intByte(recordingTimes)
                    console.log(state.recordingTime,'state.recordingTime')
                    const contentInput=fileDataList.substr(38,fileDataList.length-48)
                    let unComNum = 0
                    let lastComData = 0
                    let ecgData = 0
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
                            ecgData = ecgData * 0.002467
                            contentOutput.push(ecgData)
                        }
                    }
                    let obj = {
                        contentOutput
                    }
                    const value = connectData.sendCommand('F4', '00', [])//发送结束命令
                    connectData.writeCharacter(value)
                    store.state.FileReadfinish = true
                    state.ProgressSecond=(num/state.fileSize)*100
                    fileData=[]
                    store.state.startIndex++
                    if(store.state.startIndex < FileListdata.length+1){
                        let data = FileListdata[store.state.startIndex].oldName+ "00000000";
                        const val= connectData.sendCommand('F2','00',data)//发送开始命令
                        connectData.writeCharacter(val)
                    }
                    return obj
                }
            }
            // console.log('读文件数据长度2:'+ num)
            state.ProgressSecond=(num/state.fileSize)*100
            // console.log('state.ProgressSecond2',state.ProgressSecond)
            // return {
            //     fileData
            // }

        }
    },
    UserList: (state) => { //获取用户列表
        const content = state.userListInfo.content
        if (content) {
            const userNum = content.substr(0, 4)
            const id = content.substr(4, content.length)
            let userID = []
            return {
                userNum,
                id
            }
        }
    },
    DeviceRunStatus: (state) => { //获取设备运行状态
        const content = state.deviceRunStatusInfo.content
        if (content) {
            const runState = content.substr(0, 2)
            const startTime = content.substr(2, 14)
            let time = ''
            for (let i = 0; i < startTime.length; i += 2) {
                time += startTime.substring(i, i + 2)
            }
            const recordTime = content.substr(16, 4)
            return {
                runState,
                MeasureInfo: {
                    startTime: time,
                    recordTime
                }
            }
        }
    },
    RealTimeData: (state) => { //获取实时数据
        const content = state.realTimeDataInfo.content
        if (content) {
            const hr = parseInt(content.substr(2, 2)+content.substr(0, 2),16)
            const sysFlag = parseInt(content.substr(4, 2), 16)
            const percent = parseInt(content.substr(6, 2), 16)
            const recordTime = content.substr(8, 8)
            const runStatus = parseInt(content.substr(16, 2), 16)%8
            let obj = {
                hr,
                sysFlag,
                percent,
                recordTime,
                runStatus
            }
            store.state.deviceRunParametersInfo = obj
            const waveform = content.substr(40, content.length)
            const samplingNum = parseInt(waveform.substr(0, 4), 16)
            let waveData = waveform.substr(4, waveform.length)
            let data = ''
            for(let i = 0;i<waveData.length;i+=4){
                let wave = parseInt(waveData.substring(i+2,i+4)+waveData.substring(i,i+2),16)
                if(wave>32767){
                    wave = wave-65536
                }
                else if(wave==32767){
                    wave = 0
                }
                wave = wave * (1.0035 * 1800) / (4096 * 178.74)
                // console.log(wave)
                data = wavelet_filter_convert(wave,reset) * 2
                store.state.waveDataArray.push(data)
                reset = 0
            }
        }
    },
    DeviceRunParameters: (state) => { //获取设备运行参数
        const content = state.deviceRunParametersInfo.content
        // console.log(content)
        if (content) {
            const hr = content.substr(0, 4)
            const sysFlag = parseInt(content.substr(4, 2), 16)
            const percent = parseInt(content.substr(6, 2), 16)
            const recordTime = content.substr(8, 8)
            const runStatus = parseInt(content.substr(16, 2), 16)%8
            const reserved = content.substr(18, 22)
            let fileName = fromCharCode(reserved)
            console.log(fileName)
            let obj = {
                hr,
                sysFlag,
                percent,
                recordTime,
                runStatus,
                reserved
            }
            return obj
        }
    }
}
export default getters;
