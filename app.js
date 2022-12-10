var media = new Vue({
    el:'#media',
    template:`
<div class="media">
    <!--<template v-if="this.basename!="></template>-->
    <div class="media-dir" v-if="sourcelists.length>0" >
        <div class="media-nav">
            <div v-if="revert" @click="revertPlay(revert.filename,revert.time)" class="media-nav-item media-nav-revent">▶继续播放{{revert.filename}}</div>
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
    
    <div class="media-history" v-if="Object.keys(allHistory).length>0">
        <h2>播放历史</h2> 
        <div @click="jump(dir)" class="media-history-item" v-for="(history,dir) in allHistory">
            {{dir}}/{{history.filename}} 
            <span>{{history.timeFormat}}</span>
            <span @click="removeHistory(dir)" class="media-history-delete">x</span>
        </div>
    </div>
    
    <div class="artplayer-app" ref="player" style="display: none;">
        {{pathname}}/{{playfilename}}
        <div id="artplayer" ref="player"></div>
    </div>
   
</div>
    `,
    data(){
        return {
            allHistory:{},
            mediaDir: [],
            sourcelists: {},
            pathname: null,
            basename: null,
            playfilename: null,
            revert: null
        }
    },
    methods:{
        loadList(response){
            if(response.code==200){
                this.currentDir()
                this.sourcelists = []

                for (let ck in response.data.content){
                    if(response.data.content[ck].type==2){
                        response.data.content[ck].url = this.pathname + '/' + response.data.content[ck].name
                        this.sourcelists.push(response.data.content[ck])
                    }
                }
                this.revertTime();


                this.allHistory = {}
                if(this.pathname=='/'){
                    this.allHistory = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
                    for (let k in this.allHistory){
                        this.allHistory[k].timeFormat = Math.floor(this.allHistory[k].time/60) + ':' + this.allHistory[k].time%60
                    }
                }
                this.$forceUpdate()
            }
        },
        jump(url){
            location.href=url
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
                console.log(e)
                let response = JSON.parse(e.detail.responseText)
                if(response){
                    if(response.data && response.data.content){
                        this.loadList(response);
                    }
                }
            })
        },
        currentDir(){
            this.pathname = decodeURIComponent(location.pathname);
            let paths = this.pathname.split('/')
            this.filename = paths.pop()
            return this.basename = paths.join('/')

        },
        playMedia(path,sign,time = null){
            this.$el.style.width = '100vw'
            this.$el.style.height = '100vh'
            this.$refs.player.style.display = 'block';

            let src = location.protocol + '//' + location.host+'/d'+path+'?sign='+sign
            let subpaths = path.split('/');
            this.playfilename = subpaths.pop()
            this.art.switchUrl(src,this.playfilename)

            if(time!=null){
                this.art.on('play', () => {
                    this.art.seek = time
                });
            }
            this.art.on('video:ended',()=>{
                this.next()
            })
            this.art.play()
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
            if(this.$refs.player.style.display=='none'){
                document.getElementsByClassName('media')[0].style.display='none';
                return
            }
            this.$el.style.width = 'auto'
            this.$el.style.height = 'auto'
            this.$refs.player.style.display = 'none';
            this.playfilename = null
            this.revertTime()

            if(this.art){
                this.art.pause()
            }
        },
        revertTime(){
            let mediaProcess = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
            if(mediaProcess[this.pathname]){
                this.revert = mediaProcess[this.pathname]
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
                console.log(this.pathname+'/'+filename,sign,time)
                this.playMedia(this.pathname+'/'+filename,sign,time)
                this.revert = null
            }
        },
        removeHistory(dir){
            let mediaProcess = JSON.parse(localStorage.getItem('mediaProcess')??'{}')
            delete mediaProcess[dir]
            this.allHistory = mediaProcess
            localStorage.setItem('mediaProcess',JSON.stringify(mediaProcess))
        }
    },
    created(){
        this.currentDir()
        this.reBuildXHR()
    },
    mounted(){
        this.revertTime();
        this.initplayer()
    }
})
