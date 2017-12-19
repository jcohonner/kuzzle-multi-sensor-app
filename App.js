import React from 'react'
import { AppStack } from './config/router'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { Text, View } from 'react-native'
import reducers from './store/reducers'
import { setKuzzleSettings, setUserCredentials } from './store/actions'
import { AsyncStorage } from 'react-native'



export var store;


export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      settingsLoaded: false
    }
  }

  /*
    componentDidMount()
  */
  componentDidMount() {
    console.log("component did mount, youhou!!!");
    this.loadSettings()

  }

  loadSettings = async () => {
    var user, password, host, port
    try {
      user = await AsyncStorage.getItem("kuzzle-user")
    }
    catch (error) {
      user = undefined
    }

    try {
      password = await AsyncStorage.getItem("kuzzle-password")
    }
    catch (error) {
      password = undefined
    }

    try {
      hostname = await AsyncStorage.getItem("kuzzle-hostname")
    }
    catch (error) {
      hostname = '192.168.1.108'
    }

    try {
      port = await AsyncStorage.getItem("kuzzle-port")
    }
    catch (error) {
      console.log('No settings found...', error);
      port = 7512
    }
    kuzzleSettings = {
      hostname,
      port,
      user,
      port
    }
    console.log('Got settings: ', kuzzleSettings);

    console.log("Creating redux store...");
    store = createStore(
      reducers,
      {
        kuzzleSettings
      })
    this.subscribeStore()
    this.setState({ settingsLoaded: true })
  }


  subscribeStore = () => {

    store.subscribe(async function () {
      console.log('store updated: ', store.getState().kuzzleSettings)
      kuzzleSettings = store.getState().kuzzleSettings
      var settings = []

      if (kuzzleSettings.hostname) {
        console.log("Adding kuzzle-hostname to settings");
        settings.push(["kuzzle-hostname", kuzzleSettings.hostname])
      }
      if (kuzzleSettings.port) {
        console.log("Adding kuzzle-port to settings");
        settings.push(["kuzzle-port", kuzzleSettings.port])
      }
      if (kuzzleSettings.user) {
        console.log("Adding kuzzle-user to settings");
        settings.push(["kuzzle-user", kuzzleSettings.user])
      }
      if (kuzzleSettings.password) {
        console.log("Adding kuzzle-password to settings");
        settings.push(["kuzzle-password", kuzzleSettings.password])
      }
      try {
        console.log(settings)
        await AsyncStorage.multiSet(
          settings
        ).then(() => console.log('settings saved'))
      }
      catch (e) {
        console.log("Error saving settings: ", e);
        // console.log(e.stack)
      }
    })
  }

  render() {
    return this.state.settingsLoaded ? (
      <Provider store={store}>
        <AppStack />
      </Provider>
    ) : (<View style={{flex:1}}><Text>Loading...</Text></View>)
  }
}



