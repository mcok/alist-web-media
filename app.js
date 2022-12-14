var media = new Vue({
    el:'#media',
    template:`
<div class="media">
    <!--<template v-if="this.basename!="></template>-->
    <div v-show="!show" @click="showPannel" class="media-show-btn">媒体列表</div>
    
    <div id="media-dir" class="media-dir" :class="{'media-with-player':showPlayer}" v-if="sourcelists.length>0 && show==1" >
        <div class="media-nav">
            <div>{{pathname}}</div>
            <div v-if="revert" @click="revertPlay(revert.filename,revert.time)" class="media-nav-item media-nav-revent">▶继续播放{{revert.filename}} <span style="color:#00b91f;">{{revert.timeFormat}}</span> </div>
            <div @click="prev()" class="media-nav-item media-nav-prev">⏮上一集</div>
            <div @click="next()" class="media-nav-item media-nav-next">⏭下一集</div>
            <div @click="close()" class="media-nav-item media-nav-next">❌关闭</div>
        </div>
        <div class="media-files">
            <div v-for="(source) in sourcelists" @click="playMedia(source.url,source.sign)" :data-sign="source.sign" class="media-item" :class="{'media-current-item':playfilename==source.name}">
            {{source.name}}
            </div>
        </div>
    </div>
    
    <div id="media-history" class="media-history" v-if="Object.keys(allHistory).length>0 && show==2">
        <h2>播放历史</h2> <span @click="close()" class="media-history-delete">x</span>
        <div @click="jump(dir)" class="media-history-item" v-for="(history,dir) in allHistory">
            {{dir}}/{{history.filename}} 
            <span @click.prevert="autoRevertPlay(dir)" style="color: #00b91f;">▶{{history.timeFormat}}</span>
            <span @click.prevent="removeHistory(dir)" class="media-history-delete">x</span>
        </div>
    </div>
    
    <div class="artplayer-app" v-show="showPlayer" >
        <div class="media-player-title">{{pathname}}/{{playfilename}}</div>
        <div id="artplayer" ref="player"></div>
    </div>
   
</div>
    `,
    data(){
        return {
            show:1,
            showPlayer:0,
            allHistory:{},
            mediaDir: [],
            sourcelists: {},
            pathname: null,
            basename: null,
            playfilename: null,
            revert: null,
            firstLoaded:0
        }
    },
    watch:{
        show(newValue){
            localStorage.setItem('MediaShow',newValue)
            if(newValue==2){
                this.refreshHistory()
            }
        },
    },
    methods:{
        loadList(response,pathname = null){
            this.firstLoaded = 1
            if(response.code==200){
                this.pathname = pathname??this.pathname
                this.sourcelists = []
                for (let ck in response.data.content){
                    if(response.data.content[ck].type==2){
                        response.data.content[ck].url = (pathname??this.pathname) + '/' + response.data.content[ck].name
                        this.sourcelists.push(response.data.content[ck])
                    }
                }
                if(this.sourcelists.length==0 && this.show==1){
                    this.show = 2
                }
                if(this.sourcelists.length>0 && this.show==2){
                    this.show=1
                }

                this.revertTime(this.pathname);

                this.$forceUpdate()
            }
        },
        jump(url){
            axios.post('/api/fs/list',{
                path:url,password:"",page:1,per_page:0,refresh:true
            }).then((response)=>{
                this.pathname = url
                this.revertTime(this.pathname)
                this.show = 1
            })
        },
        autoRevertPlay(url){
            axios.post('/api/fs/list',{
                path:url,password:"",page:1,per_page:0,refresh:true
            }).then((response)=>{
                this.show = 1
                this.pathname = url
                this.revertTime(this.pathname)
                this.revertPlay(this.revert.filename,this.revert.time)
            })
        },
        reBuildXHR(){
            function ajaxEventTrigger(event) {
                var ajaxEvent = new CustomEvent(event, { detail: this });
                window.dispatchEvent(ajaxEvent);
            }
            var oldXHR = window.XMLHttpRequest;
            function newXHR() {
                var realXHR = new oldXHR();
                realXHR.addEventListener('abort', function () { ajaxEventTrigger.call(this, 'ajaxAbort'); }, false);
                realXHR.addEventListener('error', function () { ajaxEventTrigger.call(this, 'ajaxError'); }, false);
                realXHR.addEventListener('load', function () { ajaxEventTrigger.call(this, 'ajaxLoad'); }, false);
                realXHR.addEventListener('loadstart', function () { ajaxEventTrigger.call(this, 'ajaxLoadStart'); }, false);
                realXHR.addEventListener('progress', function () { ajaxEventTrigger.call(this, 'ajaxProgress'); }, false);
                realXHR.addEventListener('timeout', function () { ajaxEventTrigger.call(this, 'ajaxTimeout'); }, false);
                realXHR.addEventListener('loadend', function () { ajaxEventTrigger.call(this, 'ajaxLoadEnd'); }, false);
                realXHR.addEventListener('readystatechange', function() { ajaxEventTrigger.call(this, 'ajaxReadyStateChange'); }, false);
                return realXHR;
            }
            window.XMLHttpRequest = newXHR;

            window.addEventListener('ajaxLoadEnd',(e)=> {
                let response = JSON.parse(e.detail.responseText)
                if(response){
                    if(response.data && response.data.content){
                        this.loadList(response,this.currentDir());
                    }
                }
            })
        },
        currentDir(){
            this.pathname = decodeURIComponent(location.pathname);
            let paths = this.pathname.split('/')
            this.filename = paths.pop()
            return this.pathname
        },
        playMedia(path,sign,time = null){
            console.log(path,sign,time)
            this.$el.style.width = '100vw'
            this.$el.style.height = '100vh'
            this.showPlayer = 1;

            let src = location.protocol + '//' + location.host+'/d'+path+'?sign='+sign
            let subpaths = path.split('/');
            this.playfilename = subpaths.pop()
            this.art.switchUrl(src,this.playfilename)
            this.art.title = this.playfilename
            this.art.subtitle = this.playfilename

            this.art.on('video:ended',()=>{
                this.next()
            })

            this.art.play().then(()=>{
                if(time){
                    this.art.currentTime = time
                    time = null;
                }
            })

            this.revert = null
        },
        initplayer(){
            this.art = new Artplayer({
                container: '#artplayer',
                volume: 0.5,
                autoSize: false,
                autoMini: true,
                loop: false,
                flip: true,
                playbackRate: true,
                aspectRatio: true,
                setting: true,
                hotkey: true,
                pip: true,
                mutex: true,
                fullscreen: true,
                fullscreenWeb: true,
                subtitleOffset: true,
                miniProgressBar: false,
                playsInline: true,
            });
            this.art.on('video:progress',(e)=>{
                if(this.pathname && this.playfilename){
                    this.handleProcess(this.pathname,this.playfilename,parseInt(this.art.currentTime))
                }
            })
        },
        handleProcess(dir,filename,time){
            if(dir && time>0){
                let mediaProcess = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
                mediaProcess[dir] = {filename,time:parseInt(time)};
                localStorage.setItem('mediaProcess',JSON.stringify(mediaProcess))
            }
        },
        next(){
            let nextElement = document.getElementsByClassName('media-current-item')[0].nextElementSibling
            if(nextElement){
                this.playMedia(this.pathname+'/'+nextElement.textContent.trim(),nextElement.dataset.sign)
            }
        },
        prev(){
            let prevElement = document.getElementsByClassName('media-current-item')[0].previousElementSibling
            if(prevElement){
                this.playMedia(this.pathname+'/'+prevElement.textContent.trim(),prevElement.dataset.sign)
            }
        },
        close(){
            if(this.showPlayer==0){
                if(this.show==1){
                    this.show =2
                }else if(this.show==2){
                    this.show = 0
                }
            }else{
                this.closePlayer()
            }
        },
        closePlayer(){
            console.log('closePlayer')
            this.$el.style.width = 'auto'
            this.$el.style.height = 'auto'
            this.showPlayer = 0;
            this.playfilename = null
            this.revertTime(this.pathname)

            if(this.art && this.art.playing){
                this.art.pause()
            }
        },
        showPannel(){
            if(this.sourcelists.length>0){
                this.show = 1
            }else{
                this.refreshHistory()
                this.show = 2
            }
        },
        refreshHistory(){
            this.allHistory = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
            for (let k in this.allHistory){
                this.allHistory[k].timeFormat = Math.floor(this.allHistory[k].time/60) + ':' + this.allHistory[k].time%60
            }
        },
        revertTime(pathname){
            let mediaProcess = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
            if(mediaProcess[pathname]){
                this.revert = mediaProcess[pathname]
                this.revert.timeFormat = Math.floor(this.revert.time/60) + ':' + this.revert.time%60
            }else{
                this.revert = null
            }
        },
        revertPlay(filename,time){
            let sign = null
            for (let k in this.sourcelists){
                if(this.sourcelists[k].name==filename){
                    sign = this.sourcelists[k].sign
                    break;
                }
            }
            if(sign){
                this.playMedia(this.pathname+'/'+filename,sign,time)
            }
        },
        removeHistory(dir){
            let mediaProcess = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
            delete mediaProcess[dir]
            this.allHistory = mediaProcess
            localStorage.setItem('mediaProcess',JSON.stringify(mediaProcess))
        },
        //当插件初始化完成的时候，有概率没有监听到当前文件列表页的数据，所有有必要进行第一次文件列表的加载
        firstLoad(){
            axios.post('/api/fs/list',{
                path:this.currentDir(),password:"",page:1,per_page:0,refresh:true
            }).then((response)=>{
                this.currentDir()
            })
        }
    },
    created(){
        this.show = Number(localStorage.getItem('MediaShow')??0)
    },
    mounted(){
        this.currentDir()
        this.revertTime(this.pathname);
        this.initplayer()
        this.reBuildXHR()
        this.firstLoad()
    }
})
